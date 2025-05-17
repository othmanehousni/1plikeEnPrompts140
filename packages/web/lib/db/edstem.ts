import { db } from './index';
import { courses, threads, answers } from "./schema";
import { eq, desc as drizzleDesc, count } from "drizzle-orm";
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
	// Log uniquement pour thread spécial
	const isSpecialThread = threadId === 182914;
	if (isSpecialThread) {
		console.log(`[EDSTEM.ts] 📝 Syncing answers for special thread #182914...`);
	}
	
	let edAnswersFromAPI: EDListedAnswer[] = []; 
	try {
		// Add timeout protection for API calls
		const threadDataPromise = client.fetchThread(threadId);
		const timeoutPromise = new Promise<null>((_, reject) => 
			setTimeout(() => reject(new Error("Thread fetch timeout")), 30000)
		);
		
		let threadData;
		try {
			threadData = await Promise.race([threadDataPromise, timeoutPromise]) as any;
			if (!threadData || !threadData.answers) {
				console.error(`[EDSTEM.ts] ⚠️ Invalid thread data received for ${threadId}`);
				return { threadId, answersInserted: 0, answersUpdated: 0, answersErrored: 1 };
			}
		} catch (timeoutError) {
			console.error(`[EDSTEM.ts] ⚠️ Timeout fetching thread ${threadId}:`, timeoutError);
			return { threadId, answersInserted: 0, answersUpdated: 0, answersErrored: 1 };
		}

		edAnswersFromAPI = threadData.answers.map((answer: any) => ({
			id: answer.id,
			parent_id: answer.parent_id,
			message: answer.content || answer.document || null,
			images: client.extractImageUrls(answer.content as string),
			is_resolved: answer.is_resolved,
			created_at: answer.created_at,
			updated_at: answer.updated_at || answer.created_at, // Ensure it's not null
		}));

		if (!edAnswersFromAPI || edAnswersFromAPI.length === 0) {
			if (isSpecialThread) {
				console.log(`[EDSTEM.ts] ⚠️ No answers found for thread #182914`);
			}
			return { threadId, answersInserted: 0, answersUpdated: 0, answersErrored: 0 };
		}
		
		if (isSpecialThread) {
			console.log(`[EDSTEM.ts] 📊 Found ${edAnswersFromAPI.length} answers for thread #182914`);
		}

		let answersInserted = 0;
		let answersUpdated = 0;
		let answersErrored = 0;
		
		// Fetch all existing answers in one batch query
		const answerIds = edAnswersFromAPI.map(a => a.id);
		const existingAnswersQuery = await db.query.answers.findMany({
			where: eq(answers.courseId, threadData.course_id),
			columns: {
				id: true,
				updatedAt: true
			}
		});
		
		// Create a Map for faster lookups
		const existingAnswersMap = new Map(
			existingAnswersQuery.map(answer => [answer.id, answer])
		);

		for (const edAnswer of edAnswersFromAPI) { // edAnswer is EDListedAnswer
			try {
				const existingAnswer = existingAnswersMap.get(edAnswer.id);

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

        // Generate embedding only for new answers or if answer content is updated
        let embedding = null;
        const needsEmbedding = !existingAnswer || 
          (existingAnswer.updatedAt && 
           new Date(edAnswer.updated_at).getTime() > existingAnswer.updatedAt.getTime());
        
        if (togetherApiKey && edAnswer.message && needsEmbedding) {
          // Log uniquement pour thread spécial
          if (isSpecialThread) {
            console.log(`[EDSTEM.ts] 🧠 Generating embedding for answer ${edAnswer.id} in thread #182914`);
          }
          
          const textForEmbedding = prepareAnswerTextForEmbedding(edAnswer.message as string);
          
          // Add timeout protection for embedding generation
          const embeddingPromise = generateEmbeddings(textForEmbedding, togetherApiKey);
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("Embedding generation timeout")), 20000)
          );
          
          try {
            embedding = await Promise.race([embeddingPromise, timeoutPromise]);
            
            // Log uniquement pour thread spécial
            if (isSpecialThread && embedding) {
              console.log(`[EDSTEM.ts] ✅ Generated embedding for answer ${edAnswer.id} in thread #182914`);
            }
          } catch (embeddingError) {
            console.error(`[EDSTEM.ts] ⚠️ Embedding generation failed for answer ${edAnswer.id}:`, embeddingError);
            // Continue without embedding rather than failing the whole sync
          }
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
		
		// Log uniquement pour thread spécial
		if (isSpecialThread) {
			console.log(`[EDSTEM.ts] ✅ Thread #182914 - Résumé des réponses: Insérées: ${answersInserted}, Mises à jour: ${answersUpdated}, Erreurs: ${answersErrored}`);
		}
		
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
	let shouldContinueFetching = true;

	try {
		// Vérifier la connexion à la base de données en comptant les threads existants
		try {
			const existingThreadCount = await db.select({ count: count() }).from(threads).where(eq(threads.courseId, courseId));
			console.log(`[EDSTEM.ts] 🔢 Nombre de threads existants dans la DB pour le cours ${courseId}: ${existingThreadCount[0]?.count || 0}`);
		} catch (dbError) {
			console.error(`[EDSTEM.ts] ❌ Erreur lors de la vérification des threads existants:`, dbError);
		}
		
		// Create a cache for thread data to avoid repeated DB queries
		const threadCache = new Map();
		
		// Fetch and process pages of threads one by one, with early termination
		while (hasMorePages && shouldContinueFetching) {
			console.log(`[EDSTEM.ts] 📄 Downloading page ${currentPage} for course ${courseName || courseId}...`);
			
			// Add timeout protection for API calls
			const pageThreadsPromise = client.getThreadsForCourse(courseId, { page: currentPage, limit: 30 });
			const timeoutPromise = new Promise<null>((_, reject) => 
				setTimeout(() => reject(new Error("API timeout")), 30000)
			);
			
			let pageThreads;
			try {
				pageThreads = await Promise.race([pageThreadsPromise, timeoutPromise]) as EDListedThread[];
			} catch (timeoutError) {
				console.error(`[EDSTEM.ts] ⚠️ Timeout fetching threads for course ${courseName || courseId} (page ${currentPage}):`, timeoutError);
				break; // Exit the loop on timeout
			}
			
			if (!pageThreads || pageThreads.length === 0) {
				console.log(`[EDSTEM.ts] ℹ️ No threads found for course ${courseName || courseId} on page ${currentPage}`);
				break;
			}
			
			console.log(`[EDSTEM.ts] 📥 Received ${pageThreads.length} threads for course ${courseName || courseId} (page ${currentPage})`);
			
			// Traiter immédiatement cette page pour voir si on doit continuer
			let pageHasChanges = false;
			let pageHasErrors = false;
			
			// Préparer les requêtes en batch pour vérifier l'existence des threads
			const existingThreadsQuery = await db.query.threads.findMany({
				where: eq(threads.courseId, courseId),
				columns: {
					id: true,
					updatedAt: true
				}
			});
			
			// Créer un Map pour accélérer les recherches
			const existingThreadsMap = new Map(
				existingThreadsQuery.map(thread => [thread.id, thread])
			);
			
			// Vérification rapide pour voir si quelque chose a changé sur cette page
			for (const thread of pageThreads) {
				try {
					// Vérifier si ce thread existe déjà et est à jour
					const existingThread = existingThreadsMap.get(thread.id);
					
					// Add to our cache for later use
					threadCache.set(thread.id, existingThread || null);
					
					const needsUpdate = !existingThread || 
						(existingThread.updatedAt && 
						new Date(thread.updated_at).getTime() > existingThread.updatedAt.getTime());
					
					if (needsUpdate) {
						pageHasChanges = true;
						// Don't break early - we want the full set of thread IDs in our cache
					}
				} catch (error) {
					pageHasErrors = true;
					console.error(`[EDSTEM.ts] Erreur lors de la vérification du thread ${thread.id}:`, error);
				}
			}
			
			// Si aucun thread de cette page n'a changé et qu'il n'y a pas eu d'erreurs,
			// on peut arrêter de récupérer les pages suivantes (optimisation)
			if (!pageHasChanges && !pageHasErrors) {
				console.log(`[EDSTEM.ts] 🛑 Optimisation: Aucun thread modifié sur la page ${currentPage} - arrêt de la synchronisation.`);
				shouldContinueFetching = false;
				// We don't need to process this page any further
				hasMorePages = pageThreads.length === 30;
				currentPage++;
				continue;
			} else {
				// Sinon on ajoute cette page aux threads à traiter et on continue
				edThreadsFromAPI = [...edThreadsFromAPI, ...pageThreads];
			}
			
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
			// Débogage spécifique pour le thread 182914
			if (edThread.id === 182914) {
				console.log(`[EDSTEM.ts] 🔎 THREAD SPÉCIAL DÉTECTÉ #182914 - "${edThread.title}"`);
				console.log(`[EDSTEM.ts] 📝 Détails du thread 182914:`, {
					id: edThread.id,
					title: edThread.title,
					created_at: edThread.created_at,
					updated_at: edThread.updated_at,
					category: edThread.category,
					has_content: !!edThread.content,
					has_document: !!edThread.document,
					course_id: edThread.course_id
				});
			}
			
			try {
				// Check cache first before querying DB
				let existingThread = threadCache.get(edThread.id);
				
				// If not in cache, check DB
				if (existingThread === undefined) {
					existingThread = await db.query.threads.findFirst({
						where: eq(threads.id, edThread.id),
					});
					
					// Store in cache for future reference
					threadCache.set(edThread.id, existingThread);
				}
				
				// Debug uniquement pour le thread spécial ou si verbose logging est activé
				if (edThread.id === 182914) {
					console.log(`[EDSTEM.ts] 🔍 Thread #182914 - État dans DB: ${existingThread ? 'présent' : 'absent'}`);
				}

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

        // Generate embedding ONLY for NEW threads, pas pour les mises à jour
        let embedding = null;
        const isNewThread = !existingThread;
        
        if (togetherApiKey && isNewThread) {
          // Log uniquement pour thread spécial
          if (edThread.id === 182914) {
            console.log(`[EDSTEM.ts] 🧠 Generating embedding for NEW thread #182914`);
          }
          
          const textForEmbedding = prepareThreadTextForEmbedding(
            edThread.title,
            typeof edThread.document === 'string' ? edThread.document : null,
            edThread.category,
            edThread.subcategory
          );
          
          // Add timeout protection for embedding generation
          const embeddingPromise = generateEmbeddings(textForEmbedding, togetherApiKey);
          const timeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("Embedding generation timeout")), 20000)
          );
          
          try {
            embedding = await Promise.race([embeddingPromise, timeoutPromise]);
            
            // Log uniquement pour thread spécial
            if (edThread.id === 182914 && embedding) {
              console.log(`[EDSTEM.ts] ✅ Generated embedding for thread #182914`);
            }
          } catch (embeddingError) {
            console.error(`[EDSTEM.ts] ⚠️ Embedding generation failed for thread ${edThread.id}:`, embeddingError);
            // Continue without embedding rather than failing the whole sync
          }
        }

				// Débogage spécifique pour thread 182914
				if (edThread.id === 182914) {
					console.log(`[EDSTEM.ts] 🧪 Thread #182914 - Étape de mise à jour DB - existingThread:`, existingThread ? 'trouvé' : 'non trouvé');
				}
				
				if (existingThread) {
					// Ne vérifier les réponses que si le thread a été mis à jour
					let needSyncAnswers = false;
					
					// Mise à jour du thread uniquement s'il y a des modifications
					if (existingThread.updatedAt && new Date(edThread.updated_at).getTime() > existingThread.updatedAt.getTime()) {
						await db.update(threads)
							.set({ 
                ...threadData, 
                updatedAt: new Date(edThread.updated_at),
                ...(embedding ? { embedding } : {})
              })
							.where(eq(threads.id, edThread.id));
						threadsUpdated++;
						
						// Comme le thread a été mis à jour, on doit aussi vérifier les réponses
						needSyncAnswers = true;
					
					} 
					
					// Ne synchroniser les réponses que si le thread a été mis à jour
					if (needSyncAnswers) {
						await syncAnswersForThread(edThread.id, client, togetherApiKey);
					}
				} else {
					try {
						await db.insert(threads).values({ 
							id: edThread.id, 
							...threadData,
							...(embedding ? { embedding } : {})
						});

						threadsInserted++;

					} catch (insertError) {
						console.error(`[EDSTEM.ts] ❌ ERREUR D'INSERTION pour thread ${edThread.id}:`, insertError);
						if (edThread.id === 182914) {
							console.error(`[EDSTEM.ts] 🚨 ÉCHEC CRITIQUE pour thread #182914 - Erreur d'insertion:`, insertError);
						}
						throw insertError; // Propager l'erreur pour qu'elle soit capturée par le bloc catch externe
					}
					
					// Synchroniser les réponses pour ce nouveau thread
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

		// Log résumé global (toujours affiché car important)
		console.log(`[EDSTEM.ts] ✅ Résumé de la synchronisation pour "${courseName || courseId}": ${threadsInserted} threads insérés, ${threadsUpdated} mis à jour, ${threadsErrored} erreurs`);
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
