// This file serves as the entry point for content scripts
// It helps with initializing synchronization

console.log("[ED Extension] Content script initialized");

// Main content script that will be injected into all matched pages
console.log("[ED Extension] Main content script is running on:", window.location.href);

// Determine which site we're on
const hostname = window.location.hostname;

// If we're on ED Stem
if (hostname.includes('edstem.org')) {
  console.log("[ED Extension] Detected ED Stem site");
  
  // Extract the auth token from localStorage
  const authToken = localStorage.getItem("authToken");
  
  if (authToken) {
    console.log("[ED Extension] Auth token found:", authToken);
    
    // Check if token has changed
    chrome.storage.local.get(["edAuthToken"], (result) => {
      const storedToken = result.edAuthToken;
      
      if (storedToken !== authToken) {
        console.log("[ED Extension] Token has changed, updating storage");
        
        // Store in extension storage
        chrome.storage.local.set(
          {
            edAuthToken: authToken,
          },
          () => {
            console.log("[ED Extension] Token stored in chrome.storage.local");
            
            // Show notification banner
            showEdstemBanner();
          }
        );
      } else {
        console.log("[ED Extension] Token unchanged, not updating");
      }
    });
  }
}
// If we're on Ask-ED site
else if (hostname === 'localhost' || hostname.endsWith('.localhost') || 
         hostname === 'ask-ed.ch' || hostname.endsWith('.ask-ed.ch')) {
  console.log("[ED Extension] Detected Ask-ED site");
  
  // Get token and inject into localStorage
  chrome.storage.local.get(["edAuthToken"], (result) => {
    if (result.edAuthToken) {
      console.log("[ED Extension] Found token in storage, injecting...");
      injectTokenToAskEd(result.edAuthToken);
    } else {
      console.log("[ED Extension] No token found in storage");
    }
  });
}

// Functions for ED Stem site
function showEdstemBanner() {
  // Create notification banner
  const banner = document.createElement("div");
  banner.textContent = "Token successfully retrieved!";
  banner.style.position = "fixed";
  banner.style.bottom = "1rem";
  banner.style.right = "1rem";
  banner.style.top = "auto";
  banner.style.zIndex = "50";
  banner.style.padding = "0.75rem 1rem";
  banner.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
  banner.style.borderWidth = "1px";
  banner.style.borderStyle = "solid";
  banner.style.borderColor = "rgb(34, 197, 94)";
  banner.style.borderRadius = "0.375rem";
  banner.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
  banner.style.display = "flex";
  banner.style.alignItems = "center";
  banner.style.justifyContent = "space-between";
  banner.style.fontFamily = "system-ui, -apple-system, sans-serif";
  banner.style.color = "rgb(22, 101, 52)";
  banner.style.fontWeight = "500";
  banner.style.fontSize = "0.875rem";
  
  // Add close button
  const closeButton = document.createElement("button");
  closeButton.style.marginLeft = "1rem";
  closeButton.style.padding = "0.25rem";
  closeButton.style.borderRadius = "9999px";
  closeButton.style.cursor = "pointer";
  closeButton.style.background = "transparent";
  closeButton.style.border = "none";
  closeButton.style.color = "inherit";
  closeButton.innerHTML = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6L18 18" />
    </svg>
  `;
  closeButton.addEventListener("mouseover", () => {
    closeButton.style.backgroundColor = "rgba(229, 231, 235, 0.5)";
  });
  closeButton.addEventListener("mouseout", () => {
    closeButton.style.backgroundColor = "transparent";
  });
  closeButton.addEventListener("click", () => {
    document.body.removeChild(banner);
  });
  banner.appendChild(closeButton);
  
  // Add animation directly with transitions
  banner.style.transition = "opacity 0.2s ease, transform 0.2s ease";
  banner.style.opacity = "0";
  banner.style.transform = "translateY(20px) scale(0.95)";
  
  document.body.appendChild(banner);
  
  // Trigger animation after append
  setTimeout(() => {
    banner.style.opacity = "1";
    banner.style.transform = "translateY(0) scale(1)";
  }, 10);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    banner.style.opacity = "0";
    banner.style.transform = "translateY(20px) scale(0.95)";
    setTimeout(() => {
      if (banner.parentNode === document.body) {
        document.body.removeChild(banner);
      }
    }, 200);
  }, 5000);
}

// Functions for Ask-ED site
function injectTokenToAskEd(token: string) {
  try {
    // Get current user preferences or create new object
    const userPreferences = JSON.parse(localStorage.getItem("user-preferences") || "{}");
    
    // Make sure state exists
    if (!userPreferences.state) {
      userPreferences.state = {};
    }
    
    // Check if token has changed
    const currentToken = userPreferences.state.edStemApiKey;
    const tokenChanged = currentToken !== token;
    
    // Set the token
    userPreferences.state.edStemApiKey = token;
    
    // Save back to local storage
    localStorage.setItem("user-preferences", JSON.stringify(userPreferences));
    
    // Show success banner only if token has changed
    if (tokenChanged) {
      showAskEdBanner(token);
    }
    
    console.log("[ED Extension] Token successfully injected into Ask-ED");
    
    // Notify the page that storage has changed
    window.dispatchEvent(new Event('storage'));
    
    // Set flag to prevent repeated injections
    sessionStorage.setItem('edTokenInjected', 'true');
    
  } catch (error) {
    console.error("[ED Extension] Error injecting token:", error);
  }
}

function showAskEdBanner(token: string) {
  // Create notification banner
  const banner = document.createElement("div");
  banner.textContent = "ED token successfully inserted!";
  banner.style.position = "fixed";
  banner.style.top = "1rem";
  banner.style.left = "50%";
  banner.style.bottom = "auto";
  banner.style.zIndex = "50";
  banner.style.padding = "0.75rem 1rem";
  banner.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
  banner.style.borderWidth = "1px";
  banner.style.borderStyle = "solid";
  banner.style.borderColor = "rgb(34, 197, 94)";
  banner.style.borderRadius = "0.375rem";
  banner.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)";
  banner.style.display = "flex";
  banner.style.alignItems = "center";
  banner.style.justifyContent = "space-between";
  banner.style.fontFamily = "system-ui, -apple-system, sans-serif";
  banner.style.color = "rgb(22, 101, 52)";
  banner.style.fontWeight = "500";
  banner.style.fontSize = "0.875rem";
  
  // Add close button
  const closeButton = document.createElement("button");
  closeButton.style.marginLeft = "1rem";
  closeButton.style.padding = "0.25rem";
  closeButton.style.borderRadius = "9999px";
  closeButton.style.cursor = "pointer";
  closeButton.style.background = "transparent";
  closeButton.style.border = "none";
  closeButton.style.color = "inherit";
  closeButton.innerHTML = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6L18 18" />
    </svg>
  `;
  closeButton.addEventListener("mouseover", () => {
    closeButton.style.backgroundColor = "rgba(229, 231, 235, 0.5)";
  });
  closeButton.addEventListener("mouseout", () => {
    closeButton.style.backgroundColor = "transparent";
  });
  closeButton.addEventListener("click", () => {
    document.body.removeChild(banner);
  });
  banner.appendChild(closeButton);
  
  // Add animation directly with transitions
  banner.style.transition = "opacity 0.2s ease, transform 0.2s ease";
  banner.style.opacity = "0";
  banner.style.transform = "translateX(-50%) translateY(-20px) scale(0.95)";
  
  document.body.appendChild(banner);
  
  // Trigger animation after append
  setTimeout(() => {
    banner.style.opacity = "1";
    banner.style.transform = "translateX(-50%) translateY(0) scale(1)";
  }, 10);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    banner.style.opacity = "0";
    banner.style.transform = "translateX(-50%) translateY(-20px) scale(0.95)";
    setTimeout(() => {
      if (banner.parentNode === document.body) {
        document.body.removeChild(banner);
      }
    }, 200);
  }, 5000);
}

// Nothing needed here as specific content scripts are managed through content directories 