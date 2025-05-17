import { db } from "@/lib/db";
import { answers, threads } from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { query, courseId, limit = 5, togetherApiKey } = await req.json();

		// Add debug logging
		console.log("[SEARCH_API] Request parameters:", {
			query,
			courseId,
			courseIdType: typeof courseId,
			limit,
			hasApiKey: !!togetherApiKey,
		});

		if (!query) {
			return NextResponse.json(
				{ error: "Query parameter is required" },
				{ status: 400 },
			);
		}

		if (!courseId) {
			return NextResponse.json(
				{ error: "CourseId parameter is required" },
				{ status: 400 },
			);
		}

		// Parse and validate the courseId
		const courseIdInt = Number.parseInt(courseId, 10);
		console.log("[SEARCH_API] Parsed courseId:", {
			original: courseId,
			parsed: courseIdInt,
			isNaN: Number.isNaN(courseIdInt),
		});

		if (Number.isNaN(courseIdInt)) {
			return NextResponse.json(
				{ error: "Invalid courseId format - must be a valid integer" },
				{ status: 400 },
			);
		}

		if (!togetherApiKey) {
			return NextResponse.json(
				{ error: "API key is required for generating embeddings" },
				{ status: 400 },
			);
		}

		// Generate embeddings for the search query
		const queryEmbedding = await generateEmbeddings(query, togetherApiKey);

		if (!queryEmbedding || queryEmbedding.length === 0) {
			return NextResponse.json(
				{ error: "Failed to generate embeddings for the query" },
				{ status: 500 },
			);
		}

		// Search in threads
		const threadResults = await db
			.select({
				id: threads.id,
				title: threads.title,
				content: threads.message,
				category: threads.category,
				subcategory: threads.subcategory,
				createdAt: threads.createdAt,
				courseId: threads.courseId,
				// Calculate vector similarity (cosine similarity)
				similarity:
					sql`1 - (${threads.embedding} <=> ${JSON.stringify(queryEmbedding)})`.as(
						"similarity",
					),
			})
			.from(threads)
			.where(
				sql`${threads.courseId} = ${courseIdInt} AND ${threads.embedding} IS NOT NULL`,
			)
			.orderBy(sql`similarity DESC`)
			.limit(limit);

		// Search in answers
		const answerResults = await db
			.select({
				id: answers.id,
				threadId: answers.threadId,
				content: answers.message,
				createdAt: answers.createdAt,
				courseId: answers.courseId,
				// Calculate vector similarity (cosine similarity)
				similarity:
					sql`1 - (${answers.embedding} <=> ${JSON.stringify(queryEmbedding)})`.as(
						"similarity",
					),
			})
			.from(answers)
			.where(
				sql`${answers.courseId} = ${courseIdInt} AND ${answers.embedding} IS NOT NULL`,
			)
			.orderBy(sql`similarity DESC`)
			.limit(limit);

		// Generate EdStem URLs
		const generateEdUrl = (
			type: string,
			id: string | number,
			threadId?: string | number,
		) => {
			if (type === "thread") {
				return `https://edstem.org/courses/${courseIdInt}/discussion/${id}`;
			}
			if (type === "answer" && threadId) {
				return `https://edstem.org/courses/${courseIdInt}/discussion/${threadId}#${id}`;
			}
			return null;
		};

		// Format results with enhanced metadata
		const formattedResults = [
			...threadResults.map((thread) => ({
				id: String(thread.id),
				title: thread.title || "Thread",
				content: thread.content || "",
				similarity: Number.parseFloat(String(thread.similarity)) || 0,
				metadata: {
					source: "thread",
					category: thread.category || "uncategorized",
					subcategory: thread.subcategory || undefined,
					date: thread.createdAt
						? new Date(thread.createdAt).toISOString()
						: undefined,
					url: generateEdUrl("thread", thread.id),
					threadId: String(thread.id),
					courseId: String(courseIdInt),
				},
			})),
			...answerResults.map((answer) => ({
				id: String(answer.id),
				title: "Answer",
				content: answer.content || "",
				similarity: Number.parseFloat(String(answer.similarity)) || 0,
				metadata: {
					source: "answer",
					threadId: String(answer.threadId),
					answerId: String(answer.id),
					date: answer.createdAt
						? new Date(answer.createdAt).toISOString()
						: undefined,
					url: generateEdUrl("answer", answer.id, answer.threadId),
					courseId: String(courseIdInt),
				},
			})),
		]
			// Sort combined results by similarity
			.sort((a, b) => b.similarity - a.similarity)
			// Limit to the requested number
			.slice(0, limit);

		return NextResponse.json({
			results: formattedResults,
			query,
			courseId,
		});
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
