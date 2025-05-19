import { db } from "@/lib/db";
import { answers, threads } from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { sql, eq, desc, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
		const { query, courseId, limit = 5 } = await req.json();

		// Add debug logging
		console.log("[SEARCH_API] Request parameters:", {
			query,
			courseId,
			courseIdType: typeof courseId,
			limit,
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

		if (!OPENAI_API_KEY) {
			return NextResponse.json(
				{ error: "API key is required for generating embeddings" },
				{ status: 400 },
			);
		}

		// Generate embeddings for the search query
		const queryEmbedding = await generateEmbeddings(query, OPENAI_API_KEY);

		if (!queryEmbedding || queryEmbedding.length === 0) {
			return NextResponse.json(
				{ error: "Failed to generate embeddings for the query" },
				{ status: 500 },
			);
		}

		// Search in threads - Récupérer les threads similaires
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
			.limit(limit * 2); // Get more threads to have more answers to choose from

		// Extract thread IDs to find their answers
		const threadIds = threadResults.map(thread => thread.id);
		
		// Early exit if no similar threads found
		if (threadIds.length === 0) {
			return NextResponse.json({
				results: [],
				query,
				courseId,
				message: "No similar threads found"
			});
		}
		
		console.log(`[SEARCH_API] Found ${threadIds.length} similar threads: ${threadIds.join(', ')}`);
		
		// Get all answers for the similar threads
		const threadAnswers = await db
			.select({
				id: answers.id,
				threadId: answers.threadId,
				content: answers.message,
				createdAt: answers.createdAt,
				courseId: answers.courseId,
				isResolved: answers.isResolved,
				// If embedding exists, calculate similarity, otherwise use -1 as a placeholder
				similarity: answers.embedding 
					? sql`1 - (${answers.embedding} <=> ${JSON.stringify(queryEmbedding)})`.as("similarity")
					: sql`-1`.as("similarity"),
			})
			.from(answers)
			.where(
				and(
					eq(answers.courseId, courseIdInt),
					threadIds.length > 0 ? inArray(answers.threadId, threadIds) : sql`FALSE`
				)
			)
			.orderBy(desc(answers.createdAt));
		
		console.log(`[SEARCH_API] Found ${threadAnswers.length} answers for similar threads`);
		
		// Build a thread-to-answers mapping for easier processing
		const threadAnswersMap = new Map<number, typeof threadAnswers>();
		threadAnswers.forEach(answer => {
			if (!threadAnswersMap.has(answer.threadId)) {
				threadAnswersMap.set(answer.threadId, []);
			}
			threadAnswersMap.get(answer.threadId)?.push(answer);
		});
		
		// Also do a direct search in answers to find any that are directly relevant
		const directAnswerResults = await db
			.select({
				id: answers.id,
				threadId: answers.threadId,
				content: answers.message,
				createdAt: answers.createdAt,
				courseId: answers.courseId,
				isResolved: answers.isResolved,
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
		
		// Format thread results with their answers
		const formattedThreadResults = threadResults
			.filter(thread => threadAnswersMap.has(thread.id)) // Only include threads that have answers
			.map(thread => {
				const threadAnswers = threadAnswersMap.get(thread.id) || [];
				// For each thread, compute the max similarity of its answers
				const maxAnswerSimilarity = Math.max(
					...threadAnswers.map(answer => Number.parseFloat(String(answer.similarity)) || 0),
					0 // Default if there are no answers or all similarities are NaN
				);
				
				// Sort answers from newest to oldest
				const sortedAnswers = [...threadAnswers].sort((a, b) => {
					// Resolved answers first
					if (a.isResolved && !b.isResolved) return -1;
					if (!a.isResolved && b.isResolved) return 1;
					
					// Then by date (newest first)
					const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
					const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
					return dateB.getTime() - dateA.getTime();
				});
				
				// Get the best answer (resolved or most recent)
				const bestAnswer = sortedAnswers[0];
				
				return {
					id: String(thread.id),
					title: thread.title || "Thread",
					// Include both thread content and the best answer
					content: `Question: ${thread.content || ""}\n\nBest Answer: ${bestAnswer?.content || "No answer available"}`,
					// Use the max of thread similarity and best answer similarity
					similarity: Math.max(
						Number.parseFloat(String(thread.similarity)) || 0,
						maxAnswerSimilarity
					),
					metadata: {
						source: "thread_with_answers",
						category: thread.category || "uncategorized",
						subcategory: thread.subcategory || undefined,
						date: thread.createdAt
							? new Date(thread.createdAt).toISOString()
							: undefined,
						url: generateEdUrl("thread", thread.id),
						threadId: String(thread.id),
						courseId: String(courseIdInt),
						answerCount: threadAnswers.length,
						bestAnswerId: bestAnswer ? String(bestAnswer.id) : undefined,
						isResolved: bestAnswer?.isResolved || false,
					},
				};
			});
		
		// Format direct answer results
		const formattedDirectAnswerResults = directAnswerResults.map(answer => ({
			id: String(answer.id),
			title: "Direct Answer",
			content: answer.content || "",
			similarity: Number.parseFloat(String(answer.similarity)) || 0,
			metadata: {
				source: "direct_answer",
				threadId: String(answer.threadId),
				answerId: String(answer.id),
				date: answer.createdAt
					? new Date(answer.createdAt).toISOString()
					: undefined,
				url: generateEdUrl("answer", answer.id, answer.threadId),
				courseId: String(courseIdInt),
				isResolved: answer.isResolved || false,
			},
		}));
		
		// Combine and sort all results
		const formattedResults = [
			...formattedThreadResults,
			...formattedDirectAnswerResults,
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
