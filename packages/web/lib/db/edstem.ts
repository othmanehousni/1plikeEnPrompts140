import { db } from './index';
import { courses, threads, answers } from "./schema";
import { eq, desc as drizzleDesc } from "drizzle-orm";
import { z } from "zod";
import { EDClient } from '@/lib/ed-client';
import type { EDListedThread, EDListedAnswer, EDCourse, EDUserCourseEntry } from '@/types/schema/ed.schema'; // Import centralized types
import { 
  generateEmbeddings, 
  prepareThreadTextForEmbedding, 
  prepareAnswerTextForEmbedding 
} from '@/lib/embeddings';

// Local type definitions for EdStemThread and EdStemAnswer (used by sync logic) are now replaced by EDListedThread and EDListedAnswer.
// EdStemImage type is also imported.

// Define return types for sync functions for better type safety
type ThreadSyncStats = {
    courseId: number;
    threadsInserted: number;
    threadsUpdated: number;
    threadsErrored: number;
};

type AnswerSyncStats = {
    threadId: number;
    answersInserted: number;
    answersUpdated: number;
    answersErrored: number;
};

// Type for the action part of the sync result
type SyncAction = "skipped" | "updated" | "inserted" | "error" | "skipped_id_mismatch" | "error_main";

// Type for individual course sync result
type CourseSyncResult = {
    id: number | null;
    action: SyncAction;
    error?: string;
    threads: Partial<ThreadSyncStats>; 
};

// Type for course data in our database (remains as is, specific to DB structure)
export type CourseRecord = {
	id: number;
	code: string;
	name: string;
	year: string;
	lastSynced: Date | null;
};

export type EdStemSyncOptions = {
	apiKey: string;
	courseId?: number;
  togetherApiKey?: string;
};

const EU_EDSTEM_USER_ENDPOINT = "https://eu.edstem.org/api/user";

export async function testEdStemConnection(apiKey: string): Promise<string | undefined> {
	const client = new EDClient(apiKey);
	try {
		console.log("[EDSTEM.ts] Attempting to get EdStem token for testing user info endpoint...");
		console.log("[EDSTEM.ts] Successfully obtained token for testing user info.");

		console.log(`[EDSTEM.ts] Testing EdStem user info endpoint (${EU_EDSTEM_USER_ENDPOINT}) with obtained token...`);
		await client.getCourses(); 
		
		console.log(`[EDSTEM.ts] Connection test to ${EU_EDSTEM_USER_ENDPOINT} successful with new token!`);
		return EU_EDSTEM_USER_ENDPOINT; 

	} catch (error) {
		console.error("[EDSTEM.ts] Error during EdStem connection test (getUserInfo): ", error);
		return undefined;
	}
}

async function syncAnswersForThread(threadId: number, client: EDClient, togetherApiKey?: string): Promise<AnswerSyncStats> {
	console.log(`Syncing answers for thread ${threadId}...`);
	let edAnswersFromAPI: EDListedAnswer[] = []; 
	try {
		const threadData = await client.fetchThread(threadId);

		edAnswersFromAPI = threadData.answers.map(answer => ({
			id: answer.id,
			parent_id: answer.parent_id,
			message: answer.content || answer.document || null,
			images: client.extractImageUrls(answer.content as string),
			is_resolved: answer.is_resolved,
			created_at: answer.created_at,
			updated_at: answer.updated_at || answer.created_at, // Ensure it's not null
		}));

		if (!edAnswersFromAPI || edAnswersFromAPI.length === 0) {
			console.log(`[EDSTEM.ts] No answers found for thread ${threadId} from EdStem or answers array is empty.`);
			return { threadId, answersInserted: 0, answersUpdated: 0, answersErrored: 0 };
		}
		console.log(`[EDSTEM.ts] Received ${edAnswersFromAPI.length} answers for thread ${threadId} from EdStem.`);

		let answersInserted = 0;
		let answersUpdated = 0;
		let answersErrored = 0;

		for (const edAnswer of edAnswersFromAPI) { // edAnswer is EDListedAnswer
			try {
				const existingAnswer = await db.query.answers.findFirst({
					where: eq(answers.id, edAnswer.id),
				});

        // Prepare answer data
				const answerData = {
					threadId: threadId,
					courseId: threadData.course_id,
					parentId: edAnswer.parent_id || null,
					message: edAnswer.message || null, // EDListedAnswer has 'message'
					images: client.extractImageUrls(edAnswer.message as string), // Cast images to EdStemImage[] or handle appropriately
					isResolved: edAnswer.is_resolved ?? false,
					createdAt: new Date(edAnswer.created_at),
					updatedAt: new Date(edAnswer.updated_at),
				};

        // Generate embedding if Together API key is available
        let embedding = null;
        if (togetherApiKey && edAnswer.message) {
          const textForEmbedding = prepareAnswerTextForEmbedding(edAnswer.message as string);
          embedding = await generateEmbeddings(textForEmbedding, togetherApiKey);
          console.log(`[EDSTEM.ts] Generated embedding for answer ${edAnswer.id}`);
        }

				if (existingAnswer) {
					if (existingAnswer.updatedAt && new Date(edAnswer.updated_at).getTime() > existingAnswer.updatedAt.getTime()) {
						await db.update(answers)
							.set({ 
                ...answerData, 
                updatedAt: new Date(edAnswer.updated_at),
                ...(embedding ? { embedding } : {})
              })
							.where(eq(answers.id, edAnswer.id));
						answersUpdated++;
					}
				} else {
					await db.insert(answers).values({ 
            id: edAnswer.id, 
            ...answerData,
            ...(embedding ? { embedding } : {})
          });
					answersInserted++;
				}
			} catch (error) {
				answersErrored++;
				console.error(`[EDSTEM.ts] Error processing answer ${edAnswer.id} for thread ${threadId}:`, error);
				if (error && typeof error === 'object' && 'code' in error && (error as {code:string}).code === '42P01') {
                    console.warn(`[EDSTEM.ts] DB operation failed for answer ${edAnswer.id} because 'answers' table does not exist. Setup migrations.`);
                }
			}
		}
		console.log(`[EDSTEM.ts] Finished syncing answers for thread ${threadId}. Inserted: ${answersInserted}, Updated: ${answersUpdated}, Errored: ${answersErrored}`);
		return { threadId, answersInserted, answersUpdated, answersErrored };
	} catch (error) {
		console.error(`[EDSTEM.ts] Failed to fetch or process answers for thread ${threadId}:`, error);
		return { threadId, answersInserted: 0, answersUpdated: 0, answersErrored: edAnswersFromAPI?.length || 1 };
	}
}

async function syncThreadsForCourse(courseId: number, client: EDClient, courseName: string = "", togetherApiKey?: string): Promise<ThreadSyncStats> {
	console.log(`[EDSTEM.ts] 🔄 Syncing threads for course ${courseName || courseId}...`);
	let edThreadsFromAPI: EDListedThread[] = []; 
	let currentPage = 0;
	let hasMorePages = true;
	let threadsInserted = 0;
	let threadsUpdated = 0;
	let threadsErrored = 0;

	try {
		// Fetch all pages of threads using pagination
		while (hasMorePages) {
			console.log(`[EDSTEM.ts] 📄 Downloading page ${currentPage} for course ${courseName || courseId}...`);
			const pageThreads = await client.getThreadsForCourse(courseId, { page: currentPage, limit: 30 });
			
			if (!pageThreads || pageThreads.length === 0) {
				console.log(`[EDSTEM.ts] ℹ️ No threads found for course ${courseName || courseId} on page ${currentPage}`);
				break;
			}
			
			console.log(`[EDSTEM.ts] 📥 Received ${pageThreads.length} threads for course ${courseName || courseId} (page ${currentPage})`);
			edThreadsFromAPI = [...edThreadsFromAPI, ...pageThreads];
			
			// If we got fewer threads than the limit, there are no more pages
			hasMorePages = pageThreads.length === 30;
			currentPage++;
		}

		if (edThreadsFromAPI.length === 0) {
			console.log(`[EDSTEM.ts] ⚠️ No threads found for course ${courseName || courseId}`);
			return { courseId, threadsInserted: 0, threadsUpdated: 0, threadsErrored: 0 };
		}
		
		console.log(`[EDSTEM.ts] 📊 Total of ${edThreadsFromAPI.length} threads found for course ${courseName || courseId}`);

		// Process all threads
		for (const edThread of edThreadsFromAPI) {
			try {
				const existingThread = await db.query.threads.findFirst({
					where: eq(threads.id, edThread.id),
				});

        // Prepare thread data
				const threadData = {
					courseId: courseId,
					title: edThread.title,
					message: typeof edThread.document === 'string' ? edThread.document : null,
					category: edThread.category || null,
					subcategory: edThread.subcategory || null,
					subsubcategory: edThread.subsubcategory || null,
					isAnswered: edThread.is_answered ?? false,
					isStaffAnswered: edThread.is_staff_answered ?? false,
					isStudentAnswered: edThread.is_student_answered ?? false,
					createdAt: new Date(edThread.created_at),
					updatedAt: new Date(edThread.updated_at),
					images: client.extractImageUrls(edThread.content as string),
				};

        // Generate embedding if Together API key is available
        let embedding = null;
        if (togetherApiKey) {
          const textForEmbedding = prepareThreadTextForEmbedding(
            edThread.title,
            typeof edThread.document === 'string' ? edThread.document : null,
            edThread.category,
            edThread.subcategory
          );
          embedding = await generateEmbeddings(textForEmbedding, togetherApiKey);
          console.log(`[EDSTEM.ts] Generated embedding for thread ${edThread.id}`);
        }

				if (existingThread) {
					if (existingThread.updatedAt && new Date(edThread.updated_at).getTime() > existingThread.updatedAt.getTime()) {
						await db.update(threads)
							.set({ 
                ...threadData, 
                updatedAt: new Date(edThread.updated_at),
                ...(embedding ? { embedding } : {})
              })
							.where(eq(threads.id, edThread.id));
						threadsUpdated++;
						await syncAnswersForThread(edThread.id, client, togetherApiKey);
					}
				} else {
					await db.insert(threads).values({ 
            id: edThread.id, 
            ...threadData,
            ...(embedding ? { embedding } : {})
          });
					threadsInserted++;
					await syncAnswersForThread(edThread.id, client, togetherApiKey);
				}
			} catch (error) {
				threadsErrored++;
				console.error(`[EDSTEM.ts] ❌ Error processing thread ${edThread.id} for course ${courseName || courseId}:`, error);
				if (error && typeof error === 'object' && 'code' in error && (error as {code:string}).code === '42P01') {
                    console.warn(`[EDSTEM.ts] ⚠️ DB operation failed for thread ${edThread.id}: 'threads' table does not exist. Run migrations.`);
                }
			}
		}

		console.log(`[EDSTEM.ts] ✅ Threads sync completed for course ${courseName || courseId}. Inserted: ${threadsInserted}, Updated: ${threadsUpdated}, Errors: ${threadsErrored}`);
		return { courseId, threadsInserted, threadsUpdated, threadsErrored };
	} catch (error) {
		console.error(`[EDSTEM.ts] ❌ Failed to sync threads for course ${courseName || courseId}:`, error);
		return { courseId, threadsInserted: 0, threadsUpdated: 0, threadsErrored: edThreadsFromAPI?.length || 1 };
	}
}

export async function syncEdStemCourses(options: EdStemSyncOptions): Promise<{
    count: number;
    results: CourseSyncResult[];
    lastSynced: Date | null;
}> {
	const { apiKey, courseId, togetherApiKey } = options;
	const client = new EDClient(apiKey);

  if (togetherApiKey) {
    console.log("[EDSTEM.ts] 🧠 Vector embeddings will be generated using Together AI");
  } else {
    console.log("[EDSTEM.ts] ⚠️ No Together API key provided, skipping vector embedding generation");
  }

	try {
		const coursesResp = await client.getCourses();
		
		if (coursesResp.length === 0) {
			console.log("[EDSTEM.ts] ⚠️ No courses found in API response.");
			let lastSyncDate: Date | null = null;
			try {
				lastSyncDate = await getLastSyncDate();
			} catch (dbError) {
				 if (dbError && typeof dbError === 'object' && 'code' in dbError && (dbError as {code: string}).code === '42P01') {
					console.warn("[EDSTEM.ts] ⚠️ getLastSyncDate failed because 'courses' table does not exist. Run migrations.");
				} else {
					console.error("[EDSTEM.ts] ❌ Unknown DB error in getLastSyncDate:", dbError);
				}
			}
			return {
				count: 0,
				results: [],
				lastSynced: lastSyncDate
			};
		}
		console.log(`[EDSTEM.ts] 📚 ${coursesResp.length} courses received from EdStem`);
		
		const syncResults: CourseSyncResult[] = [];

		for (const edCourse of coursesResp) { // userCourseEntry is EDUserCourseEntry
			const courseActionResult: CourseSyncResult = {
                id: edCourse.id,
                action: "skipped",
                error: undefined,
                threads: {},
            };

			try {
				if (courseId && edCourse.id !== courseId) {
					courseActionResult.action = "skipped_id_mismatch";
					syncResults.push(courseActionResult); 
					continue;
				}

				const courseName = edCourse.name || edCourse.code || `Course #${edCourse.id}`;
				console.log(`[EDSTEM.ts] 🔄 Starting sync for course "${courseName}"`);

				const existingCourse = await db.query.courses.findFirst({
					where: eq(courses.id, edCourse.id),
				});

				if (existingCourse) {
					await db
						.update(courses)
						.set({
							code: edCourse.code || existingCourse.code || "",
							name: edCourse.name || existingCourse.name || "",
							year: edCourse.year || existingCourse.year || "", 
							lastSynced: new Date(),
						})
						.where(eq(courses.id, edCourse.id));
					courseActionResult.action = "updated";
				} else {
					await db.insert(courses).values({
						id: edCourse.id,
						code: edCourse.code || "",
						name: edCourse.name || "",
						year: edCourse.year || "",
						lastSynced: new Date(),
					});
					courseActionResult.action = "inserted";
				}
				
				const threadSyncStats = await syncThreadsForCourse(edCourse.id, client, courseName, togetherApiKey);
				courseActionResult.threads = threadSyncStats;
				console.log(`[EDSTEM.ts] ✅ Course "${courseName}" sync completed successfully!`);

			} catch (error) {
				courseActionResult.action = "error";
				courseActionResult.error = String(error);
				if (error && typeof error === 'object' && 'code' in error && (error as {code:string}).code === '42P01') { 
					console.warn(`[EDSTEM.ts] ⚠️ DB operation failed for course ${edCourse.id} because 'courses' table does not exist. Run migrations.`);
					courseActionResult.error = "Database table 'courses' not found.";
				}
				console.error(`[EDSTEM.ts] ❌ Error processing course ${edCourse.id}:`, error);
			}
			syncResults.push(courseActionResult);
		}

		let latestOverallSyncDate: Date | null = new Date();
		try {
			const latestCourseSync = await db.query.courses.findFirst({
				orderBy: (coursesTable, { desc }) => [drizzleDesc(coursesTable.lastSynced)],
			});
			latestOverallSyncDate = latestCourseSync?.lastSynced ? new Date(latestCourseSync.lastSynced) : new Date();
		} catch (dbError) {
			if (dbError && typeof dbError === 'object' && 'code' in dbError && (dbError as {code: string}).code === '42P01') {
				console.warn("[EDSTEM.ts] ⚠️ Could not get latest sync date because 'courses' table does not exist.");
			} else {
				console.error("[EDSTEM.ts] ❌ Unknown DB error:", dbError);
			}
		}

		const successCount = syncResults.filter(r => r.action === 'inserted' || r.action === 'updated').length;
		console.log(`[EDSTEM.ts] 🎉 Global sync completed! ${successCount} courses successfully synchronized.`);

		return {
			count: successCount,
			results: syncResults,
			lastSynced: latestOverallSyncDate
		};
	} catch (error) {
		console.error("[EDSTEM.ts] ❌ Error synchronizing courses:", error);
		return {
			count: 0,
			results: [{ id: null as number | null, action: "error_main" as const, error: String(error), threads: {} }],
			lastSynced: null
		};
	}
}

export async function getLastSyncDate(): Promise<Date | null> {
	try {
		const latestSync = await db.query.courses.findFirst({
			orderBy: (coursesTable, { desc }) => [drizzleDesc(coursesTable.lastSynced)],
		});
		return latestSync?.lastSynced ? new Date(latestSync.lastSynced) : null;
	} catch (error) {
        if (error && typeof error === 'object' && 'code' in error && (error as {code: string}).code === '42P01') {
            console.warn("getLastSyncDate failed because 'courses' table does not exist. Please setup Drizzle migrations.");
            return null; 
        }
		console.error("[EDSTEM.ts] Error getting last sync date:", error);
		throw error; 
	}
}
