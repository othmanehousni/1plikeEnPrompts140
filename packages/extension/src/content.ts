import type { PlasmoCSConfig } from "plasmo";

// Configuration for matching Ed pages
export const config: PlasmoCSConfig = {
  matches: ["https://*.edstem.org/*"]
};

// Function to extract the Ed auth token
const extractEdToken = () => {
  try {
    // Look for the token in localStorage
    const token = localStorage.getItem("ed-session");
    
    if (token) {
      // Store the token in the extension's storage
      chrome.storage.local.set({ edAuthToken: token }, () => {
        console.log("Ed auth token stored successfully");
      });
    }
  } catch (error) {
    console.error("Error extracting Ed token:", error);
  }
};

// Run when the content script is injected
const init = () => {
  console.log("Ed token extractor initialized");
  extractEdToken();
  
  // Also set up a listener for any potential token changes
  window.addEventListener("storage", (event) => {
    if (event.key === "ed-session") {
      extractEdToken();
    }
  });
};

// Initialize
init(); 