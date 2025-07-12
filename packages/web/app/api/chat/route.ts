import { memory } from "@/ai/mastra";
import { createChatAgentWithModel } from "@/ai/agents/chat-agent";
import type { modelID } from "@/ai/providers";
import { type UIMessage } from "ai";
import { validateEpflDomain } from "@/lib/auth-utils";
import { NextRequest } from "next/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
	// Validate EPFL domain before processing chat request
	const validation = await validateEpflDomain(req);
	if (!validation.isValid) {
		return validation.response!;
	}

	// Ensure user exists (should be guaranteed by validation)
	if (!validation.user?.email) {
		return new Response(
			JSON.stringify({ error: "User email not found" }), 
			{ 
				status: 401,
				headers: { "Content-Type": "application/json" }
			}
		);
	}

	const {
		messages,
		selectedModel,
		threadId,
	}: {
		messages: UIMessage[];
		selectedModel?: modelID;
		threadId?: string;
	} = await req.json();

	// Get agent with selected model or default
	const agent = createChatAgentWithModel(memory, selectedModel || "o4-mini");

	try {
		// Use user email as resourceId for memory persistence
		const resourceId = validation.user.email;
		
		// Get the latest user message
		const userMessage = messages[messages.length - 1]?.content || "";

		// Stream the agent response
		const response = await agent.stream(userMessage, {
			threadId: threadId || `thread_${Date.now()}`,
			resourceId,
		});

		// Create a simple text stream for AI SDK text protocol
		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of response.textStream) {
						controller.enqueue(new TextEncoder().encode(chunk));
					}
					controller.close();
				} catch (error) {
					controller.error(error);
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-cache",
			},
		});

	} catch (error) {
		console.error("Chat API Error:", error);
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
