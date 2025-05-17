import type { EDCourse, EDThread, ExtensionMessage, FetchPostsResult, SendResponsePayload, DbCourse } from "@ask-ed/shared";

// Background service worker to handle sync and provide API token
let syncInProgress = false;
let pendingSync = false;

// Function to fetch new posts from ED API
async function fetchNewPosts(token: string, lastSyncTime: number): Promise<FetchPostsResult> {
  try {
    // First, fetch course metadata to check activity timestamps
    const apiUrl = "https://edstem.org/api/courses";
    
    const coursesResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!coursesResponse.ok) {
      throw new Error(`API request failed with status ${coursesResponse.status}`);
    }
    
    const coursesData = await coursesResponse.json() as EDCourse[];
    
    // Fetch the lastSynced timestamps from our database
    const dbCoursesResponse = await fetch("http://localhost:3000/api/courses/sync-status", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!dbCoursesResponse.ok) {
      throw new Error(`Failed to fetch course sync status: ${dbCoursesResponse.status}`);
    }
    
    const dbCourses = await dbCoursesResponse.json() as DbCourse[];
    
    // Map course IDs to their lastSynced timestamps from our database
    const courseLastSynced = new Map<number, number>();
    for (const course of dbCourses) {
      courseLastSynced.set(course.id, course.lastSynced ? new Date(course.lastSynced).getTime() : 0);
    }
    
    // Filter courses that need syncing (lastActive > lastSynced)
    const coursesToSync = coursesData.filter(course => {
      // EDCourseSchema uses last_active_at
      const lastActive = course.last_active_at ? new Date(course.last_active_at).getTime() : Date.now();
      const lastSynced = courseLastSynced.get(course.id) || 0;
      return lastActive > lastSynced;
    });
    
    if (coursesToSync.length === 0) {
      console.log("[ED Extension] No courses need syncing - all up to date");
      return { success: true, newPostsCount: 0, posts: [], syncedCourseIds: [] };
    }
    
    console.log(`[ED Extension] Syncing ${coursesToSync.length} courses with new activity`);
    
    const courseIdsToSync = coursesToSync.map(course => course.id);
    const allNewPosts: EDThread[] = []; // Use EDThread[]
    
    for (const course of coursesToSync) {
      const courseId = course.id;
      // The Ed API for threads might return an array of EDThread directly, or EDThreadResponse which has a thread and users
      // Assuming it returns EDThread[] for simplicity based on previous EdPost[] structure.
      // If it returns EDThreadResponse[], modification will be needed here.
      const postsUrl = `https://edstem.org/api/courses/${courseId}/threads`; 
      const postsResponse = await fetch(postsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!postsResponse.ok) {
        console.error(`Failed to fetch posts for course ${courseId}: ${postsResponse.status}`);
        continue;
      }
      
      // Assuming postsData is an array of EDThread objects
      const threadsData = await postsResponse.json() as EDThread[]; 
      
      const newThreads = threadsData.filter((thread: EDThread) => 
        new Date(thread.created_at).getTime() > lastSyncTime
      );
      
      // Ensure courseId is correctly part of each thread, EDThreadSchema has course_id
      const postsWithCourseData = newThreads.map(t => ({
        ...t,
        course_id: course.id, // Ensure course_id is set, matching EDThreadSchema
      }));
      
      allNewPosts.push(...postsWithCourseData);
    }
    
    console.log(`[ED Extension] Found ${allNewPosts.length} new posts since last sync`);
    
    return { 
      success: true, 
      newPostsCount: allNewPosts.length, 
      posts: allNewPosts, // This is now EDThread[]
      syncedCourseIds: courseIdsToSync
    };
  } catch (error: unknown) {
    console.error("[ED Extension] Error fetching posts:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Function to update lastSynced timestamp for courses
async function updateLastSynced(courseIds: number[]): Promise<boolean> {
  try {
    const apiUrl = "http://localhost:3000/api/sync";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ courseIds })
    });
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const result = await response.json();
    console.log(`[ED Extension] Updated lastSynced timestamps: ${result.message}`);
    return true;
  } catch (error) {
    console.error("[ED Extension] Error updating lastSynced:", error);
    return false;
  }
}

// Function to process the sync operation
async function performSync(token: string, lastSyncTime: number): Promise<FetchPostsResult> {
  if (syncInProgress) {
    pendingSync = true;
    return { success: false, message: "Sync already in progress" };
  }
  syncInProgress = true;
  try {
    const result = await fetchNewPosts(token, lastSyncTime);
    if (result.success && result.posts && result.posts.length > 0) {
      try {
        // result.posts is now EDThread[]
        const saveResponse = await fetch("http://localhost:3000/api/posts/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ posts: result.posts }), 
        });
        if (!saveResponse.ok) {
          console.error(`[ED Extension] Failed to save posts: ${saveResponse.status}`);
        } else {
          const saveData = await saveResponse.json();
          console.log(`[ED Extension] Successfully sent ${result.newPostsCount} posts to the backend for saving. Response: ${saveData.message}`);
        }
      } catch (saveError: unknown) {
        console.error("[ED Extension] Error saving posts:", saveError);
      }
      console.log(`[ED Extension] Successfully synced ${result.newPostsCount} posts`);
    }
    const syncedCourseIds = result.syncedCourseIds || [];
    if (syncedCourseIds.length > 0) {
      await updateLastSynced(syncedCourseIds);
    }
    return result;
  } catch (error: unknown) {
    console.error("[ED Extension] Error during sync:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    syncInProgress = false;
    if (pendingSync) {
      pendingSync = false;
      chrome.storage.local.get(["edAuthToken", "lastSyncTime"], (res) => {
        if (res.edAuthToken) {
          performSync(res.edAuthToken, res.lastSyncTime || 0);
        }
      });
    }
  }
}

const SYNC_INTERVAL_MINUTES = 30;
function scheduleRegularSync() {
  chrome.alarms.create("syncPosts", {
    periodInMinutes: SYNC_INTERVAL_MINUTES
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "syncPosts") {
      console.log("[ED Extension] Running scheduled sync via alarm");
      chrome.storage.local.get(["edAuthToken", "lastSyncTime"], (result) => {
        if (result.edAuthToken) {
          performSync(result.edAuthToken, result.lastSyncTime || 0);
        }
      });
    }
  });
}
scheduleRegularSync();

async function logSyncStatus() {
  try {
    const dbCoursesResponse = await fetch("http://localhost:3000/api/courses/sync-status", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!dbCoursesResponse.ok) {
      console.error(`[ED Extension] Failed to fetch course sync status: ${dbCoursesResponse.status}`);
      return;
    }
    const dbCourses = await dbCoursesResponse.json() as DbCourse[]; // Use imported DbCourse
    console.log('[ED Extension] Current course sync status:');
    for (const course of dbCourses) {
      console.log(`Course ID ${course.id}: Last synced ${course.lastSynced || 'never'}`);
    }
  } catch (error: unknown) {
    console.error('[ED Extension] Error logging sync status:', error);
  }
}

chrome.runtime.onMessage.addListener((request: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: SendResponsePayload) => void) => {
  if (request.action === "startSync") {
    if (request.token && typeof request.lastSyncTime === 'number') {
      performSync(request.token, request.lastSyncTime)
        .then(result => {
          logSyncStatus();
          sendResponse(result);
        })
        .catch(error => {
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
        });
    } else {
      sendResponse({ success: false, error: "Missing token or lastSyncTime for startSync action" });
    }
    return true;
  }
  if (request.action === "getSyncStatus") {
    logSyncStatus()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      });
    return true;
  }
});

chrome.runtime.onMessageExternal.addListener(
  (request: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: SendResponsePayload) => void) => {
    if (request.action === "getEdToken") {
      chrome.storage.local.get(["edAuthToken"], (result) => {
        sendResponse({ token: result.edAuthToken || null });
      });
      return true;
    }
  }
); 