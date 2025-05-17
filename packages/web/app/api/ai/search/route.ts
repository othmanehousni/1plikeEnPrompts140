import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { threads, answers } from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { sql } from "drizzle-orm";

// Define request schema
const searchRequestSchema = z.object({
	query: z.string().min(1),
	courseId: z.number().optional(),
	limit: z.number().optional().default(10),
	togetherApiKey: z.string(),
});

async function searchThreads(
	queryEmbedding: number[],
	courseId?: number,
	limit = 10,
) {
	try {
		// Use PostgreSQL vector extension to calculate cosine similarity
		const query = db
			.select({
				id: threads.id,
				title: threads.title,
				message: threads.message,
				category: threads.category,
				subcategory: threads.subcategory,
				courseId: threads.courseId,
				createdAt: threads.createdAt,
				// Calculate cosine similarity score
				score:
					sql`1 - (${threads.embedding} <=> ${JSON.stringify(queryEmbedding)})`.as(
						"similarity_score",
					),
			})
			.from(threads)
			.where(
				courseId
					? sql`${threads.courseId} = ${courseId}`
					: sql`${threads.embedding} is not null`,
			)
			.orderBy(sql`similarity_score desc`)
			.limit(limit);

		const results = await query;
		return results;
	} catch (error) {
		console.error("Error searching threads:", error);
		return [];
	}
}

async function searchAnswers(
	queryEmbedding: number[],
	courseId?: number,
	limit = 10,
) {
	try {
		// Use PostgreSQL vector extension to calculate cosine similarity
		const query = db
			.select({
				id: answers.id,
				message: answers.message,
				threadId: answers.threadId,
				courseId: answers.courseId,
				createdAt: answers.createdAt,
				// Calculate cosine similarity score
				score:
					sql`1 - (${answers.embedding} <=> ${JSON.stringify(queryEmbedding)})`.as(
						"similarity_score",
					),
			})
			.from(answers)
			.where(
				courseId
					? sql`${answers.courseId} = ${courseId}`
					: sql`${answers.embedding} is not null`,
			)
			.orderBy(sql`similarity_score desc`)
			.limit(limit);

		const results = await query;
		return results;
	} catch (error) {
		console.error("Error searching answers:", error);
		return [];
	}
}
