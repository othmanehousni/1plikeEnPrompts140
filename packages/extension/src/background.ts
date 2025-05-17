// Background service worker to handle sync and provide API token
let syncInProgress = false;
let pendingSync = false;

// Interface for ED post
interface EdPost {
  id: number;
  courseId: number;
  createdAt: string;
  [key: string]: any; // Allow other properties
}

// Interface for course data
interface EdCourse {
  id: number;
  lastActive?: string;
  [key: string]: any; // Allow other properties
}

// Interface for database course
interface DbCourse {
  id: number;
  lastSynced: string | null;
}

// Function to fetch new posts from ED API
async function fetchNewPosts(token: string, lastSyncTime: number): Promise<any> {
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
    
    const coursesData = await coursesResponse.json() as EdCourse[];
    
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
    dbCourses.forEach(course => {
      courseLastSynced.set(course.id, course.lastSynced ? new Date(course.lastSynced).getTime() : 0);
    });
    
    // Filter courses that need syncing (lastActive > lastSynced)
    const coursesToSync = coursesData.filter(course => {
      const lastActive = course.lastActive ? new Date(course.lastActive).getTime() : Date.now();
      const lastSynced = courseLastSynced.get(course.id) || 0;
      return lastActive > lastSynced;
    });
    
    if (coursesToSync.length === 0) {
      console.log("[ED Extension] No courses need syncing - all up to date");
      return { success: true, newPostsCount: 0, posts: [], syncedCourseIds: [] };
    }
    
    console.log(`[ED Extension] Syncing ${coursesToSync.length} courses with new activity`);
    
    // Now fetch posts only for courses that need syncing
    const courseIds = coursesToSync.map(course => course.id);
    const allNewPosts: EdPost[] = [];
    
    // Fetch posts for each course that needs syncing
    for (const courseId of courseIds) {
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
      
      const postsData = await postsResponse.json();
      
      // Filter posts created after the last sync time
      const newPosts = postsData.filter((post: any) => 
        new Date(post.createdAt).getTime() > lastSyncTime
      );
      
      allNewPosts.push(...newPosts);
    }
    
    console.log(`[ED Extension] Found ${allNewPosts.length} new posts since last sync`);
    
    return { 
      success: true, 
      newPostsCount: allNewPosts.length, 
      posts: allNewPosts,
      syncedCourseIds: courseIds
    };
  } catch (error: unknown) {
    console.error("[ED Extension] Error fetching posts:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Function to update lastSynced timestamp for courses
async function updateLastSynced(courseIds: number[]): Promise<boolean> {
  try {
    const apiUrl = "http://localhost:3000/api/sync"; // Replace with your actual API URL in production
    
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
async function performSync(token: string, lastSyncTime: number): Promise<any> {
  if (syncInProgress) {
    pendingSync = true;
    return { success: false, message: "Sync already in progress" };
  }
  
  syncInProgress = true;
  
  try {
    const result = await fetchNewPosts(token, lastSyncTime);
    
    // If we successfully fetched posts, save them to the database
    if (result.success && result.posts && result.posts.length > 0) {
      // Here you would save the posts to your database
      // This is where you'd call your API endpoints
      
      console.log(`[ED Extension] Successfully synced ${result.newPostsCount} posts`);
    }
    
    // Get the course IDs that were synced
    const syncedCourseIds = result.syncedCourseIds || [];
    
    // Update lastSynced timestamp for all courses that were synced
    if (syncedCourseIds.length > 0) {
      await updateLastSynced(syncedCourseIds);
    }
    
    return result;
  } catch (error: unknown) {
    console.error("[ED Extension] Error during sync:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    syncInProgress = false;
    
    // Check if another sync was requested while this one was in progress
    if (pendingSync) {
      pendingSync = false;
      
      // Get the latest token and timestamp for the pending sync
      chrome.storage.local.get(["edAuthToken", "lastSyncTime"], (result) => {
        if (result.edAuthToken) {
          performSync(result.edAuthToken, result.lastSyncTime || 0);
        }
      });
    }
  }
}

// Set up a regular sync interval (e.g., every 30 minutes)
const SYNC_INTERVAL_MINUTES = 30; // 30 minutes

function scheduleRegularSync() {
  // Create an alarm that will trigger periodically
  chrome.alarms.create("syncPosts", {
    periodInMinutes: SYNC_INTERVAL_MINUTES
  });
  
  // Listen for the alarm
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

// Start the regular sync schedule
scheduleRegularSync();

// Listen for external message requests for the token
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.action === "getEdToken") {
      // Get the token from storage and send it back
      chrome.storage.local.get(["edAuthToken"], (result) => {
        sendResponse({ token: result.edAuthToken || null });
      });
      return true; // Allows using sendResponse asynchronously
    }
  }
);

// Function to log debug information about sync status
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
    
    const dbCourses = await dbCoursesResponse.json() as DbCourse[];
    
    console.log('[ED Extension] Current course sync status:');
    dbCourses.forEach(course => {
      console.log(`Course ID ${course.id}: Last synced ${course.lastSynced || 'never'}`);
    });
  } catch (error) {
    console.error('[ED Extension] Error logging sync status:', error);
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSync") {
    // Start the syncing process
    performSync(request.token, request.lastSyncTime)
      .then(result => {
        // Log sync status after completion
        logSyncStatus();
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      });
    
    return true; // Allows using sendResponse asynchronously
  } else if (request.action === "getSyncStatus") {
    // Return debug information about sync status
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
    
    return true; // Allows using sendResponse asynchronously
  }
}); 