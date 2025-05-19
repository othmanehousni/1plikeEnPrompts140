import { tool } from "ai";
import { z } from "zod";

export const weatherTool = tool({
	description: "Get the weather in a location",
	parameters: z.object({
		location: z.string().describe("The location to get the weather for"),
	}),
	execute: async ({ location }) => ({
		location,
		temperature: 72 + Math.floor(Math.random() * 21) - 10,
	}),
});

export const searchEdCourse = (selectedCourseId: string) => ({
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
		query = "",
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
