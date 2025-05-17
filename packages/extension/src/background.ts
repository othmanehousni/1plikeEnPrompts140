import type { ExtensionMessage } from "./types";

// Background service worker to handle Ed token storage and retrieval

// Listen for external messages (from the web app)
chrome.runtime.onMessageExternal.addListener(
  (request: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (request.action === "getEdToken") {
      chrome.storage.local.get(["edAuthToken"], (result) => {
        sendResponse({ token: result.edAuthToken || null });
      });
      return true;
    }
  }
);

// Listen for internal messages (from content scripts)
chrome.runtime.onMessage.addListener((request: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (request.action === "tokenSaved") {
    console.log("[ED Extension] Token was saved successfully");
    sendResponse({ success: true });
    return true;
  }
}); 