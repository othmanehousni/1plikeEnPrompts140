import { createTool } from "@mastra/core/tools";
import { z } from "zod";



export const searchEdCourse = (selectedCourseId: string) => createTool({
	id: "searchEdCourse",
	description:
		"Search for information in the current Ed course using natural language queries",
	inputSchema: z.object({
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
	}) as any,
	execute: async ({ context }) => {
		const {
			query = "",
			courseId = selectedCourseId,
			limit = 5,
		} = context;
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
				}),
			});

			if (!response.ok) {
				throw new Error(`Search failed with status: ${response.status}`);
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
				error: "Failed to search course content. Please try again later.",
			};
		}
	},
});
