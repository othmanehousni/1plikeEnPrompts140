import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EDClient } from "../../../../lib/ed-client";

const testRequestSchema = z.object({
	apiKey: z.string().min(1),
});

type EdStemTestResult = {
	endpoint: string;
	success: boolean;
	status?: number;
	statusText?: string;
	data?: unknown;
	error?: unknown;
};

export async function POST(req: NextRequest) {
	try {
		let body: unknown;
		try {
			body = await req.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		const validationResult = testRequestSchema.safeParse(body);
		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Invalid request data",
					details: validationResult.error.errors,
				},
				{ status: 400 },
			);
		}

		const { apiKey } = validationResult.data;
		const client = new EDClient(apiKey);
		const euUserEndpoint = "https://eu.edstem.org/api/user";
		let testResult: EdStemTestResult;

		try {
			console.log("Attempting EdStem connection test via EDClient.getUserInfo()...");
			const token = await client.getToken();
			await client.getUserInfo(token);

			testResult = {
				endpoint: euUserEndpoint,
				success: true,
				status: 200,
				statusText: "OK",
			};
			console.log("EdStem connection test (getUserInfo) successful via EDClient.");
		} catch (error) {
			console.error("EDClient test (getUserInfo) failed:", error);
			let errorMessage = "Unknown error during EdStem connection test.";
			let errorDetails: unknown = error;

			if (error instanceof Error) {
				errorMessage = error.message;
				if (error.message.includes("Details: ")) {
					try {
						errorDetails = JSON.parse(
							error.message.substring(
								error.message.indexOf("Details: ") + "Details: ".length,
							),
						);
					} catch (e) {
						/* ignore parse error, keep original message */
					}
				}
			}

			testResult = {
				endpoint: euUserEndpoint,
				success: false,
				error: { message: errorMessage, details: errorDetails },
			};
		}

		return NextResponse.json({
			success: testResult.success,
			results: [testResult],
			workingEndpoint: testResult.success ? euUserEndpoint : null,
			message: testResult.success
				? "Successfully connected to EdStem EU API (user endpoint) via EDClient"
				: testResult.error &&
						typeof testResult.error === "object" &&
						"message" in testResult.error
					? (testResult.error as { message: string }).message
					: "Failed to connect to EdStem EU API (user endpoint). Check server logs.",
			data: testResult,
		});
	} catch (error) {
		console.error(
			"Critical error in /api/edstem/test-connection route:",
			error,
		);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unknown critical error in test-connection API.",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
