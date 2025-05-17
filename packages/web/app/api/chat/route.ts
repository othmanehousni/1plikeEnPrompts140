import { createTogetherAI } from "@ai-sdk/togetherai";
import { streamText } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const DEFAULT_MODEL_NAME = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8";
const SYSTEM_PROMPT = `You are Ed Assistant, a helpful AI designed to assist students with course-related questions.

TOOLS & ABILITIES:
1. You have access to a searchEdCourse tool that can search for information in Ed discussion forums.
2. Only use the search tool when necessary - specifically when:
   - The user asks about course-specific content
   - The user refers to lectures, assignments, or discussions
   - You need to find information about a particular topic discussed in the course
   - You're unsure about course-specific policies or materials

RESPONSE GUIDELINES:
- Keep responses concise, educational, and to the point.
- When answering general knowledge questions, use your built-in knowledge first.
- When answering course-specific questions, use the searchEdCourse tool to find relevant information.
- Structure responses in a clear, organized manner.
- For complex topics, break down your explanation into steps or key points.
- If search results are returned, summarize and synthesize the information rather than just repeating it.
- Always cite where information comes from when using search results.
- If the search doesn't return relevant results, acknowledge this and provide general guidance based on your knowledge.

Remember that you're assisting students with their coursework. Provide explanations that help them understand concepts rather than just giving answers.`;

export async function POST(req: Request) {
	try {
		const requestBody = await req.json();

		// Validate that messages exists and is an array
		if (
			!requestBody ||
			typeof requestBody !== "object" ||
			!Array.isArray(requestBody.messages) ||
			requestBody.messages.length === 0
		) {
			return new Response(
				JSON.stringify({
					error: "Invalid request: 'messages' must be a non-empty array.",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
		const { messages } = requestBody;
		const { selectedCourseId } = requestBody;

		const togetherApiKey = req.headers.get("x-together-api-key");

		if (!togetherApiKey) {
			return new Response(
				JSON.stringify({
					error:
						"Missing TogetherAI API key. Please add your API key in the settings.",
				}),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const togetherClient = createTogetherAI({ apiKey: togetherApiKey });

		const result = streamText({
			model: togetherClient(DEFAULT_MODEL_NAME),
			messages,
			system: SYSTEM_PROMPT,
			tools: {
				searchEdCourse: {
					description:
						"Search for information in the current Ed course using natural language queries",
					parameters: z.object({
						query: z
							.string()
							.describe(
								"The natural language query to search for in the course content",
							),
						courseId: z
							.string()
							.optional()
							.describe(
								"The ID of the course to search in. If not provided, the currently selected course will be used.",
							),
						limit: z
							.number()
							.optional()
							.describe("Maximum number of results to return. Default is 5."),
					}),
					execute: async ({
						query,
						courseId = selectedCourseId,
						limit = 5,
					}) => {
						try {
							// Debug the courseId before making the request
							console.log("[SEARCH_TOOL] Input parameters:", {
								query,
								courseId,
								selectedCourseId,
								courseIdType: typeof courseId,
							});

							// Ensure courseId is an integer
							const courseIdToUse = courseId
								? String(courseId)
								: String(selectedCourseId);

							// Get the base URL from headers or environment
							const protocol = process.env.VERCEL_URL ? "https" : "http";
							const host = process.env.VERCEL_URL || "localhost:3000";
							const baseUrl = `${protocol}://${host}`;

							console.log(
								"[SEARCH_TOOL] Making request to:",
								`${baseUrl}/api/ai/search`,
							);

							// Perform vector search against the database with absolute URL
							const response = await fetch(`${baseUrl}/api/ai/search`, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									query,
									courseId: courseIdToUse,
									limit,
									togetherApiKey,
								}),
							});

							if (!response.ok) {
								throw new Error(
									`Search failed with status: ${response.status}`,
								);
							}

							const searchResults = await response.json();
							return {
								results: searchResults.results || [],
								metadata: {
									totalResults: searchResults.results?.length || 0,
									courseId,
								},
							};
						} catch (error) {
							console.error("Error in searchEdCourse:", error);
							return {
								results: [],
								error:
									"Failed to search course content. Please try again later.",
							};
						}
					},
				},
			},
			toolCallStreaming: true,
		});

		return result.toDataStreamResponse({
			getErrorMessage: (error) => {
				if (error instanceof Error) return error.message;
				return "An unknown error occurred";
			},
		});
	} catch (error: unknown) {
		console.error("[API_ROUTE_ERROR]", error);

		let errorMessage =
			"An error occurred while processing your request on the server.";
		let statusCode = 500;

		if (
			error instanceof SyntaxError &&
			error.message.toLowerCase().includes("unexpected token") &&
			error.message.toLowerCase().includes("json")
		) {
			errorMessage =
				"Invalid request format: Ensure you are sending valid JSON.";
			statusCode = 400;
		} else if (error instanceof Error) {
			// No change to errorMessage here to avoid exposing internal details by default
		}
		// Add more detailed error parsing here if needed.

		return new Response(
			JSON.stringify({
				error: errorMessage,
			}),
			{
				status: statusCode,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
