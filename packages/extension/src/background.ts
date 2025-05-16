// Background service worker to handle sync and provide API token
let syncInProgress = false;
let pendingSync = false;

// Function to fetch new posts from ED API
async function fetchNewPosts(token: string, lastSyncTime: number): Promise<any> {
  try {
    // This is a placeholder for the actual API endpoint
    // You would need to replace this with the actual ED API endpoint
    const apiUrl = "https://edstem.org/api/courses";
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter posts that were created after the last sync time
    // This is a placeholder - you'll need to adapt this to match your actual data structure
    const newPosts = data.filter((post: any) => new Date(post.createdAt).getTime() > lastSyncTime);
    
    console.log(`[ED Extension] Found ${newPosts.length} new posts since last sync`);
    
    return { success: true, newPostsCount: newPosts.length, posts: newPosts };
  } catch (error: unknown) {
    console.error("[ED Extension] Error fetching posts:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSync") {
    // Start the syncing process
    performSync(request.token, request.lastSyncTime)
      .then(result => {
        sendResponse(result);
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