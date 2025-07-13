import { createChatAgentWithModel } from "@/ai/agents/chat-agent";
import type { modelID } from "@/ai/providers";
import { streamText, convertToCoreMessages, Message, smoothStream } from "ai";
import { NextRequest } from "next/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
	console.log('🔍 [Chat API] POST request received');
	
	// Check OpenAI API key
	if (!process.env.OPENAI_API_KEY) {
		console.error('❌ [Chat API] OpenAI API key not found');
		return new Response(
			JSON.stringify({ error: "OpenAI API key not configured" }),
			{ 
				status: 500,
				headers: { "Content-Type": "application/json" }
			}
		);
	}
	console.log('🔍 [Chat API] OpenAI API key found:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
	
	try {
		const body = await req.json();
		console.log('🔍 [Chat API] Request body:', JSON.stringify(body, null, 2));
		
		const {
			messages,
			selectedModel,
			chatId,
		}: {
			messages: Message[];
			selectedModel?: modelID;
			chatId?: string;
		} = body;

		console.log('🔍 [Chat API] Parsed request:', {
			chatId,
			selectedModel,
			messagesCount: messages?.length || 0,
			lastMessage: messages?.[messages.length - 1]?.content?.slice(0, 100) + '...' || 'No messages'
		});

		if (!messages || messages.length === 0) {
			console.error('❌ [Chat API] No messages provided');
			return new Response(
				JSON.stringify({ error: "No messages provided" }),
				{ 
					status: 400,
					headers: { "Content-Type": "application/json" }
				}
			);
		}

		// Get agent configuration with selected model or default
		console.log('🔍 [Chat API] Creating agent with model:', selectedModel || "gpt-4.1");
		const agent = createChatAgentWithModel(selectedModel || "gpt-4.1");
		console.log('🔍 [Chat API] Agent created successfully');

		// Convert messages to core messages for AI SDK
		console.log('🔍 [Chat API] Converting messages to core format...');
		const coreMessages = convertToCoreMessages(messages);
		console.log('🔍 [Chat API] Core messages:', JSON.stringify(coreMessages, null, 2));

		// Stream the AI response using AI SDK
		console.log('🔍 [Chat API] Starting streamText...');
		console.log('🔍 [Chat API] Agent model:', agent.model);
		console.log('🔍 [Chat API] Agent tools:', Object.keys(agent.tools || {}));
		
		// Try without tools first to isolate the issue
		const result = await streamText({
			model: agent.model,
			system: agent.instructions,
			messages: coreMessages,
			// tools: agent.tools, // Temporarily disabled
			temperature: 0.7,
			maxTokens: 1000,
			experimental_transform: smoothStream({
				delayInMs: 20, // optional: defaults to 10ms
				chunking: 'word', // optional: defaults to 'word'
			  }),
		});
		console.log('🔍 [Chat API] StreamText completed, returning response');

		// Return the AI SDK stream with proper headers
		try {
			const response = result.toDataStreamResponse({
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				}
			});
			console.log('🔍 [Chat API] Data stream response created successfully');
			return response;
		} catch (streamError) {
			console.error('❌ [Chat API] Error creating data stream response:', streamError);
			throw streamError;
		}

	} catch (error) {
		console.error("❌ [Chat API] Error:", error);
		console.error("❌ [Chat API] Error stack:", error instanceof Error ? error.stack : 'No stack');
		
		return new Response(
			JSON.stringify({ 
				error: "Failed to process chat request",
				details: error instanceof Error ? error.message : "Unknown error"
			}),
			{ 
				status: 500,
				headers: { "Content-Type": "application/json" }
			}
		);
	}
}
