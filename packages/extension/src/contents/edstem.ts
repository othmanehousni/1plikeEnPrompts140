console.log("[ED Extension] Content script is running");

// Check if token has been shown before

// Extract the auth token from localStorage
const authToken = localStorage.getItem("authToken");

console.log("[ED Extension] Auth token:", authToken);

if (authToken) {
	// Store in local storage for persistence
	chrome.storage.local.set(
		{
			edAuthToken: authToken,
		},
		() => {
			console.log("[ED Extension] Token stored in chrome.storage.local");
			// Notify background script that token was saved
			chrome.runtime.sendMessage({ action: "tokenSaved" });
		},
	);
}

