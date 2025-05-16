// Écouter les messages externes pour partager le token avec d'autres applications
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.action === "getEdToken") {
      // Récupérer le token du stockage et le renvoyer
      chrome.storage.local.get(["edAuthToken"], (result) => {
        sendResponse({ token: result.edAuthToken || null });
      });
      return true; // Permet d'utiliser sendResponse de manière asynchrone
    }
  }
); 