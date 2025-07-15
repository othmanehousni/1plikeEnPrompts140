import { createChatAgentWithModel } from "@/ai/agents/chat-agent";
import type { modelID } from "@/ai/providers";
import { streamText, convertToCoreMessages, Message } from "ai";
import { NextRequest } from "next/server";
import { validateEpflDomain } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
	// Validate EPFL domain before processing request
	const validation = await validateEpflDomain(req);
	if (!validation.isValid) {
		return validation.response!;
	}

	// Check OpenAI API key
	if (!process.env.OPENAI_API_KEY) {
		return new Response(
			JSON.stringify({ error: "OpenAI API key not configured" }),
			{ 
				status: 500,
				headers: { "Content-Type": "application/json" }
			}
		);
	}
	
	try {
		const body = await req.json();
		
		const {
			messages,
			selectedModel,
			chatId,
		}: {
			messages: Message[];
			selectedModel?: modelID;
			chatId?: string;
		} = body;

		if (!messages || messages.length === 0) {
			return new Response(
				JSON.stringify({ error: "No messages provided" }),
				{ 
					status: 400,
					headers: { "Content-Type": "application/json" }
				}
			);
		}

		// Get user's available courses for RAG context
		let userCourses: Array<{id: number, code: string, name: string}> = [];
		try {
			const dbCourses = await db.query.courses.findMany({
				columns: {
					id: true,
					code: true,
					name: true
				},
				orderBy: (courses, { asc }) => [asc(courses.code)]
			});
			userCourses = dbCourses.map(course => ({
				id: course.id,
				code: course.code || '',
				name: course.name || ''
			}));
		} catch (coursesError) {
			console.error('Failed to fetch courses:', coursesError);
			// Continue without courses - RAG will be limited but chat still works
		}

		// Get agent configuration with selected model or default
		const agent = createChatAgentWithModel(selectedModel || "gpt-4.1", userCourses);

		// Convert messages to core messages for AI SDK
		const coreMessages = convertToCoreMessages(messages);

		// Stream the AI response using AI SDK - optimized for performance
		const result = await streamText({
			model: agent.model,
			system: agent.instructions,
			messages: coreMessages,
			// tools: agent.tools, // Temporarily disabled to fix streaming error
			temperature: 0.7,
			maxTokens: 1000,
			// Removed smoothStream to eliminate artificial delays
		});

		// Return the AI SDK stream with proper headers
		return result.toDataStreamResponse({
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			}
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
