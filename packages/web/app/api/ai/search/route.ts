import { NextResponse, NextRequest } from "next/server";
import { validateEpflDomain } from "@/lib/auth-utils";
import { Index } from "@upstash/vector";

export async function POST(req: NextRequest) {
	try {
		// Validate EPFL domain before processing request
		const validation = await validateEpflDomain(req);
		if (!validation.isValid) {
			return validation.response!;
		}

		const { query, courseId, limit = 5 } = await req.json();

		console.log("[SEARCH_API] Vector search request:", { query, courseId, limit });

		if (!query || typeof query !== "string") {
			return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
		}

		if (!courseId) {
			return NextResponse.json({ error: "CourseId parameter is required" }, { status: 400 });
		}

		const url = process.env.UPSTASH_VECTOR_REST_URL;
		const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

		if (!url || !token) {
			return NextResponse.json(
				{ error: "Vector search is not configured (missing Upstash credentials)" },
				{ status: 500 },
			);
		}

		const index = new Index({ url, token });

		// Define the proper type for Upstash Vector query results
		interface VectorQueryResult {
			id: string;
			score: number;
			vector: number[];
			metadata?: Record<string, any>;
		}

		try {
			const vectorResponse = await index.query({
				data: query,
				topK: limit,
				includeMetadata: true,
			}, {
				namespace: String(courseId)
			}) as VectorQueryResult[];

			const formatted = vectorResponse.map((result) => ({
				id: result.id,
				similarity: typeof result.score === "number" ? result.score : 0,
				title: result.metadata?.title || `${result.metadata?.type || "Content"} #${result.metadata?.threadId || result.id}`,
				content: result.metadata?.content || "",
				type: result.metadata?.type || "unknown",
				threadId: result.metadata?.threadId,
				answerId: result.metadata?.type === "answer" ? result.id.replace("answer-", "") : undefined,
				isResolved: result.metadata?.isResolved || false,
				url: result.metadata?.type === "thread" 
					? `https://edstem.org/courses/${courseId}/discussion/${result.metadata?.threadId}`
					: `https://edstem.org/courses/${courseId}/discussion/${result.metadata?.threadId}#${result.id.replace("answer-", "")}`,
				metadata: result.metadata || {},
			}));

			return NextResponse.json({
				results: formatted,
				query,
				courseId,
			});

		} catch (vectorErr) {
			console.error("[SEARCH_API] Vector query failed:", vectorErr);
			return NextResponse.json(
				{ error: "Vector search failed", details: vectorErr instanceof Error ? vectorErr.message : String(vectorErr) },
				{ status: 500 },
			);
		}
	} catch (error) {
		console.error("Error in search API:", error);
		return NextResponse.json(
			{
				error: "Failed to process search request",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
