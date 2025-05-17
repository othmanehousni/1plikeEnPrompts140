// Test visible pour vérifier l'exécution du script

console.log("[ED Extension] Ask-ED content script is running on:", window.location.href);

// Check if we're on an Ask-ED domain
function isAskEdDomain() {
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' || 
    hostname.endsWith('.localhost') || 
    hostname === 'ask-ed.ch' || 
    hostname.endsWith('.ask-ed.ch')
  );
}

// Only run on Ask-ED domains
if (!isAskEdDomain()) {
  console.log("[ED Extension] Not on Ask-ED domain, skipping token injection");
} else {
  // Function to inject the token into local storage
  function injectToken(token: string) {
    try {
      console.log("[ED Extension] Attempting to inject token into Ask-ED local storage");
      
      // Get current user preferences or create new object
      const userPreferences = JSON.parse(localStorage.getItem("user-preferences") || "{}");
      if (userPreferences.state.edStemApiKey == token) {
        console.log("[ED Extension] Token already injected, skipping");
        return true;
      }
      // Set the token
      userPreferences.state.edStemApiKey = token;
        
      // Save back to local storage
      localStorage.setItem("user-preferences", JSON.stringify(userPreferences));
        
      console.log("[ED Extension] Token successfully injected into Ask-ED local storage");
      
      // Notify the page that token has been updated
      window.dispatchEvent(new Event('storage'));

      
      return true;
    } catch (error) {
      console.error("[ED Extension] Error injecting token:", error);
      return false;
    }
  }

  // Function to handle token injection
  function processTokenInjection() {
    console.log("[ED Extension] Processing token injection on Ask-ED");
    
    chrome.storage.local.get(["edAuthToken"], (result) => {
      if (result.edAuthToken) {
        console.log("[ED Extension] Token found in storage, proceeding with injection");
        const success = injectToken(result.edAuthToken);
        
        if (success) {
          // Set a flag to prevent repeated injections
          window.sessionStorage.setItem('edTokenInjected', 'true');
        }
      } else {
        console.log("[ED Extension] No token available to inject into Ask-ED");
      }
    });
  }

  // Only inject once per session
  if (!window.sessionStorage.getItem('edTokenInjected')) {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      processTokenInjection();
    } else {
      window.addEventListener('load', processTokenInjection);
    }
  }
} 