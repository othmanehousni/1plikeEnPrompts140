import { NextResponse, type NextRequest } from "next/server";
import { EDClient } from "@/lib/ed-client";
import { validateEpflDomain } from "@/lib/auth-utils";
import type { EDCourse } from "@/types/schema/ed.schema";

interface APIError extends Error {
	message: string;
}

export async function GET(request: NextRequest) {
	try {
		// Validate EPFL domain before processing request
		const validation = await validateEpflDomain(request);
		if (!validation.isValid) {
			return validation.response!;
		}

		// Get the ED API key from request headers
		const edStemApiKey = request.headers.get("x-edstem-api-key");

		if (!edStemApiKey) {
			return NextResponse.json(
				{ error: "ED API key not provided in headers" },
				{ status: 401 },
			);
		}

		try {
			// Fetch courses from ED API with a timeout for API calls
			const client = new EDClient(edStemApiKey);
			
			// Add a timeout wrapper for the API call
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("Request timeout")), 15000);
			});
			
			const coursesPromise = client.getCourses();
			const courses = await Promise.race([coursesPromise, timeoutPromise]) as EDCourse[];
			
			if (!courses || !Array.isArray(courses)) {
				return NextResponse.json(
					{ error: "Invalid response format from EdStem API" },
					{ status: 500 },
				);
			}

			// Return courses
			return NextResponse.json({ courses });
		} catch (apiError: unknown) {
			const error = apiError as APIError;
			// Handle specific API errors
			if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
				return NextResponse.json(
					{ error: "Invalid EdStem API key. Please check your credentials." },
					{ status: 401 },
				);
			}
			
			if (error.message?.includes("429") || error.message?.includes("Too Many Requests")) {
				return NextResponse.json(
					{ error: "Rate limit exceeded on EdStem API. Please try again later." },
					{ status: 429 },
				);
			}
			
			if (error.message?.includes("timeout")) {
				return NextResponse.json(
					{ error: "EdStem API request timed out. Please try again later." },
					{ status: 504 },
				);
			}
			
			// Generic error with original message
			throw apiError;
		}
	} catch (error: unknown) {
		const err = error as APIError;
		console.error("Error fetching courses:", err);
		return NextResponse.json(
			{ 
				error: `Failed to fetch courses: ${err.message || "Unknown error"}` 
			},
			{ status: 500 },
		);
	}
}
