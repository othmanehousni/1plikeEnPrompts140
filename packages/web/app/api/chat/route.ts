import { createTogetherAI } from "@ai-sdk/togetherai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const DEFAULT_MODEL_NAME = "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo";
const SYSTEM_PROMPT = `You are a helpful assistant acting as the users\' personal assistant.`;

export async function POST(req: Request) {
	try {
		const requestBody = await req.json();
		
		// Validate that messages exists and is an array
		if (!requestBody || typeof requestBody !== 'object' || !Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
			return new Response(JSON.stringify({
				error: "Invalid request: 'messages' must be a non-empty array."
			}), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		const { messages } = requestBody;

		const togetherApiKey = req.headers.get('x-together-api-key');
		
		if (!togetherApiKey) {
			return new Response(JSON.stringify({ 
				error: "Missing TogetherAI API key. Please add your API key in the settings." 
			}), { 
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const togetherClient = createTogetherAI({ apiKey: togetherApiKey });

		const result = streamText({
			model: togetherClient(DEFAULT_MODEL_NAME),
			messages,
			system: SYSTEM_PROMPT,
			tools: {},
		});

		return result.toDataStreamResponse();
	} catch (error: unknown) {
		console.error("[API_ROUTE_ERROR]", error);
		
		let errorMessage = "An error occurred while processing your request on the server.";
		let statusCode = 500;

		if (error instanceof SyntaxError && error.message.toLowerCase().includes("unexpected token") && error.message.toLowerCase().includes("json")) {
			errorMessage = "Invalid request format: Ensure you are sending valid JSON.";
			statusCode = 400;
		} else if (error instanceof Error) {
			// No change to errorMessage here to avoid exposing internal details by default
		}
		// Add more detailed error parsing here if needed.

		return new Response(JSON.stringify({ 
			error: errorMessage 
		}), { 
			status: statusCode,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
