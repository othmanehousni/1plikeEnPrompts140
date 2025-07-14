import { tool } from "ai";
import { z } from "zod";

export const searchEdCourse = tool({
	description:
		"Search for relevant threads and answers in a specific EdStem course using vector similarity. Use this for RAG (Retrieval Augmented Generation) to find the most relevant course content before answering user questions. Returns thread IDs and snippets that you should reference in your response.",
	parameters: z.object({
		query: z
			.string()
			.describe(
				"The user's question or natural language query to search for in the course content. This will be used for semantic similarity matching.",
			),
		courseId: z
			.string()
			.describe(
				"The ID of the course to search in. REQUIRED - must be one of the course IDs available to the user.",
			),
		limit: z
			.number()
			.optional()
			.describe("Maximum number of results to return. Default is 5."),
	}),
	execute: async ({ query, courseId, limit = 5 }) => {
		try {
			// Debug the courseId before making the request
			console.log("[SEARCH_TOOL] Input parameters:", {
				query,
				courseId,
				courseIdType: typeof courseId,
			});

			if (!courseId) {
				return {
					results: [],
					error: "Course ID is required. Please specify which course to search in.",
				};
			}

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
					courseId,
					limit,
				}),
			});

			if (!response.ok) {
				throw new Error(`Search failed with status: ${response.status}`);
			}

			const searchResults = await response.json();
			
			// Format results for better RAG context
			const formattedResults = searchResults.results?.map((result: any) => ({
				id: result.id,
				type: result.type,
				threadId: result.threadId,
				answerId: result.answerId,
				title: result.title,
				content: result.content,
				similarity: result.similarity,
				isResolved: result.isResolved,
				url: result.url,
			})) || [];

			return {
				results: formattedResults,
				summary: `Found ${formattedResults.length} relevant items in course ${courseId}`,
				metadata: {
					totalResults: formattedResults.length,
					courseId,
					query,
				},
			};
		} catch (error) {
			console.error("Error in searchEdCourse:", error);
			return {
				results: [],
				error: "Failed to search course content. Please try again later.",
			};
		}
	},
});

export const getThreadDetails = tool({
	description:
		"Get detailed content of specific threads or answers from the PostgreSQL database. Use this after searching to get full content of the most relevant threads for detailed answers.",
	parameters: z.object({
		threadIds: z
			.array(z.number())
			.describe("Array of thread IDs to get detailed content for"),
		includeAnswers: z
			.boolean()
			.optional()
			.default(true)
			.describe("Whether to include answers in the response. Default is true."),
	}),
	execute: async ({ threadIds, includeAnswers = true }) => {
		try {
			const protocol = process.env.VERCEL_URL ? "https" : "http";
			const host = process.env.VERCEL_URL || "localhost:3000";
			const baseUrl = `${protocol}://${host}`;

			const response = await fetch(`${baseUrl}/api/threads/details`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					threadIds,
					includeAnswers,
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to get thread details: ${response.status}`);
			}

			const threadDetails = await response.json();
			return {
				threads: threadDetails.threads || [],
				metadata: {
					totalThreads: threadDetails.threads?.length || 0,
					includeAnswers,
				},
			};
		} catch (error) {
			console.error("Error in getThreadDetails:", error);
			return {
				threads: [],
				error: "Failed to get thread details. Please try again later.",
			};
		}
	},
});
