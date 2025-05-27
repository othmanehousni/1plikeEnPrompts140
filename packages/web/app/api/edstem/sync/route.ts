import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { syncEdStemCourses } from "@/lib/db/edstem";
import { validateEpflDomain } from "@/lib/auth-utils";

const syncRequestSchema = z.object({
	apiKey: z.string().min(1),
	courseId: z.number().optional(),
	togetherApiKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
	try {
		// Validate EPFL domain before processing request
		const validation = await validateEpflDomain(req);
		if (!validation.isValid) {
			return validation.response!;
		}

		// Parse and validate request body
		let body: unknown;
		try {
			body = await req.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		// Validate request data
		const validationResult = syncRequestSchema.safeParse(body);
		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Invalid request data",
					details: validationResult.error.errors,
				},
				{ status: 400 },
			);
		}

		const { apiKey, courseId, togetherApiKey } = validationResult.data;

		if (!apiKey) {
			return NextResponse.json(
				{ error: "EdStem API key is required" },
				{ status: 400 },
			);
		}

		console.log(
			`Starting EdStem sync${courseId ? ` for course ID ${courseId}` : ""}${togetherApiKey ? " with vector embeddings" : ""}`,
		);

		// Sync courses with database
		const syncResult = await syncEdStemCourses({ apiKey, courseId, togetherApiKey });

		return NextResponse.json({
			success: true,
			message: `Synced ${syncResult.count} courses from EdStem`,
			synced: syncResult.results,
			lastSynced: syncResult.lastSynced,
			embeddings: !!togetherApiKey,
		});
	} catch (error) {
		console.error("Error syncing EdStem data:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to sync EdStem data";

		// Determine status code based on error message
		let statusCode = 500;
		if (
			errorMessage.includes("400") ||
			errorMessage.includes("401") ||
			errorMessage.includes("403")
		) {
			statusCode = 400; // Client error
		}

		return NextResponse.json(
			{
				error: errorMessage,
				timestamp: new Date().toISOString(),
			},
			{ status: statusCode },
		);
	}
}
