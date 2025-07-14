import { NextResponse, NextRequest } from "next/server";
import { validateEpflDomain } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { threads, answers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
	try {
		// Validate EPFL domain before processing request
		const validation = await validateEpflDomain(req);
		if (!validation.isValid) {
			return validation.response!;
		}

		const { threadIds, includeAnswers = true } = await req.json();

		console.log("[THREAD_DETAILS_API] Request:", { threadIds, includeAnswers });

		if (!threadIds || !Array.isArray(threadIds) || threadIds.length === 0) {
			return NextResponse.json({ error: "Thread IDs array is required" }, { status: 400 });
		}

		// Validate that all threadIds are numbers
		const validThreadIds = threadIds.filter(id => typeof id === 'number' && !isNaN(id));
		if (validThreadIds.length === 0) {
			return NextResponse.json({ error: "Valid thread IDs are required" }, { status: 400 });
		}

		try {
			// Get threads with their answers if requested
			const threadDetails = await db.query.threads.findMany({
				where: inArray(threads.id, validThreadIds),
				with: includeAnswers ? {
					answers: {
						orderBy: (answers, { asc }) => [asc(answers.createdAt)]
					}
				} : undefined
			});

			console.log(`[THREAD_DETAILS_API] Found ${threadDetails.length} threads`);

			// Format the response
			const formattedThreads = threadDetails.map(thread => ({
				id: thread.id,
				courseId: thread.courseId,
				title: thread.title,
				message: thread.message,
				category: thread.category,
				subcategory: thread.subcategory,
				subsubcategory: thread.subsubcategory,
				isAnswered: thread.isAnswered,
				isStaffAnswered: thread.isStaffAnswered,
				isStudentAnswered: thread.isStudentAnswered,
				createdAt: thread.createdAt,
				updatedAt: thread.updatedAt,
				images: thread.images,
				url: `https://edstem.org/courses/${thread.courseId}/discussion/${thread.id}`,
				answers: includeAnswers ? ((thread as any).answers || []).map((answer: any) => ({
					id: answer.id,
					threadId: answer.threadId,
					parentId: answer.parentId,
					message: answer.message,
					images: answer.images,
					isResolved: answer.isResolved,
					createdAt: answer.createdAt,
					updatedAt: answer.updatedAt,
					url: `https://edstem.org/courses/${thread.courseId}/discussion/${thread.id}#${answer.id}`,
				})) : undefined
			}));

			return NextResponse.json({
				threads: formattedThreads,
				metadata: {
					totalThreads: formattedThreads.length,
					includeAnswers,
					requestedIds: threadIds,
					foundIds: formattedThreads.map(t => t.id)
				}
			});

		} catch (dbError) {
			console.error("[THREAD_DETAILS_API] Database error:", dbError);
			return NextResponse.json(
				{ error: "Database query failed", details: dbError instanceof Error ? dbError.message : String(dbError) },
				{ status: 500 }
			);
		}

	} catch (error) {
		console.error("[THREAD_DETAILS_API] Error:", error);
		return NextResponse.json(
			{
				error: "Failed to get thread details",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
} 