console.log("[ED Extension] Content script is running");

const authToken = localStorage.getItem("authToken");

console.log("[ED Extension] Auth token:", authToken);

if (authToken) {
  // Store in local storage for persistence
  chrome.storage.local.set({ 
    edAuthToken: authToken,
    lastSyncTime: chrome.storage.local.get(['lastSyncTime'], (result) => {
      return result.lastSyncTime || Date.now();
    })
  }, () => {
    console.log("[ED Extension] Token stored in chrome.storage.local");
  });
  
  // Create a floating sync notification
  const syncContainer = document.createElement("div");
  syncContainer.style.position = "fixed";
  syncContainer.style.top = "20px";
  syncContainer.style.right = "20px";
  syncContainer.style.zIndex = "9999";
  syncContainer.style.padding = "15px";
  syncContainer.style.background = "white";
  syncContainer.style.borderRadius = "8px";
  syncContainer.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  syncContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
  syncContainer.style.transition = "all 0.3s ease";
  syncContainer.style.display = "flex";
  syncContainer.style.flexDirection = "column";
  syncContainer.style.gap = "10px";
  syncContainer.style.width = "280px";
  
  const syncHeader = document.createElement("div");
  syncHeader.textContent = "ED Extension";
  syncHeader.style.fontWeight = "bold";
  syncHeader.style.fontSize = "16px";
  syncHeader.style.marginBottom = "5px";
  syncHeader.style.color = "#8a2be2";
  
  const syncMessage = document.createElement("div");
  syncMessage.textContent = "Would you like to synchronize new posts from ED?";
  syncMessage.style.fontSize = "14px";
  syncMessage.style.lineHeight = "1.4";
  syncMessage.style.color = "#333";
  
  const syncButtonContainer = document.createElement("div");
  syncButtonContainer.style.display = "flex";
  syncButtonContainer.style.gap = "10px";
  syncButtonContainer.style.marginTop = "5px";
  
  const syncButton = document.createElement("button");
  syncButton.textContent = "Sync Now";
  syncButton.style.padding = "8px 12px";
  syncButton.style.background = "linear-gradient(135deg, #8a2be2, #9370db)";
  syncButton.style.color = "white";
  syncButton.style.border = "none";
  syncButton.style.borderRadius = "4px";
  syncButton.style.cursor = "pointer";
  syncButton.style.flexGrow = "1";
  syncButton.style.transition = "all 0.2s ease";
  
  const dismissButton = document.createElement("button");
  dismissButton.textContent = "Dismiss";
  dismissButton.style.padding = "8px 12px";
  dismissButton.style.background = "#f1f1f1";
  dismissButton.style.color = "#666";
  dismissButton.style.border = "none";
  dismissButton.style.borderRadius = "4px";
  dismissButton.style.cursor = "pointer";
  dismissButton.style.flexGrow = "1";
  dismissButton.style.transition = "all 0.2s ease";
  
  syncButton.addEventListener("mouseover", () => {
    syncButton.style.background = "linear-gradient(135deg, #7928CA, #8a2be2)";
  });
  
  syncButton.addEventListener("mouseout", () => {
    syncButton.style.background = "linear-gradient(135deg, #8a2be2, #9370db)";
  });
  
  dismissButton.addEventListener("mouseover", () => {
    dismissButton.style.background = "#e5e5e5";
  });
  
  dismissButton.addEventListener("mouseout", () => {
    dismissButton.style.background = "#f1f1f1";
  });
  
  // Function to check for new posts and sync
  const syncPosts = async () => {
    try {
      updateSyncStatus("Checking for new posts...");
      
      // Get the last sync time
      chrome.storage.local.get(['lastSyncTime'], async (result) => {
        const lastSyncTime = result.lastSyncTime || 0;
        const currentTime = Date.now();
        
        // Send a message to the background script to initiate syncing
        chrome.runtime.sendMessage({
          action: "startSync",
          token: authToken,
          lastSyncTime: lastSyncTime
        }, (response) => {
          if (response && response.success) {
            updateSyncStatus(`Synced ${response.newPostsCount} new posts`);
            
            // Update last sync time
            chrome.storage.local.set({ lastSyncTime: currentTime }, () => {
              console.log("[ED Extension] Updated last sync time");
            });
            
            // Hide the sync container after 3 seconds
            setTimeout(() => {
              syncContainer.style.opacity = "0";
              setTimeout(() => {
                syncContainer.remove();
              }, 300);
            }, 3000);
          } else {
            updateSyncStatus("Sync failed. Please try again.");
          }
        });
      });
    } catch (error) {
      console.error("[ED Extension] Error during sync:", error);
      updateSyncStatus("Sync error. Please try again.");
    }
  };
  
  // Function to update the sync status message
  const updateSyncStatus = (message: string) => {
    syncMessage.textContent = message;
  };
  
  syncButton.addEventListener("click", () => {
    syncButtonContainer.style.display = "none";
    syncPosts();
  });
  
  dismissButton.addEventListener("click", () => {
    syncContainer.style.opacity = "0";
    setTimeout(() => {
      syncContainer.remove();
    }, 300);
  });
  
  syncButtonContainer.appendChild(syncButton);
  syncButtonContainer.appendChild(dismissButton);
  syncContainer.appendChild(syncHeader);
  syncContainer.appendChild(syncMessage);
  syncContainer.appendChild(syncButtonContainer);
  document.body.appendChild(syncContainer);
  
  // Create a sync button in bottom right
  const floatingSyncButton = document.createElement("button");
  floatingSyncButton.textContent = "Sync Now";
  floatingSyncButton.style.position = "fixed";
  floatingSyncButton.style.bottom = "20px";
  floatingSyncButton.style.right = "20px";
  floatingSyncButton.style.zIndex = "9999";
  floatingSyncButton.style.padding = "10px 15px";
  floatingSyncButton.style.background = "linear-gradient(135deg, #8a2be2, #9370db)";
  floatingSyncButton.style.color = "white";
  floatingSyncButton.style.border = "none";
  floatingSyncButton.style.borderRadius = "30px";
  floatingSyncButton.style.cursor = "pointer";
  floatingSyncButton.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)";
  floatingSyncButton.style.fontWeight = "bold";
  floatingSyncButton.style.fontSize = "14px";
  floatingSyncButton.style.transition = "all 0.3s ease";
  
  // Add sync icon
  const iconSpan = document.createElement("span");
  iconSpan.textContent = " 🔄";
  iconSpan.style.marginLeft = "5px";
  floatingSyncButton.appendChild(iconSpan);
  
  floatingSyncButton.addEventListener("mouseover", () => {
    floatingSyncButton.style.transform = "translateY(-2px)";
    floatingSyncButton.style.boxShadow = "0 6px 12px rgba(138, 43, 226, 0.4)";
  });
  
  floatingSyncButton.addEventListener("mouseout", () => {
    floatingSyncButton.style.transform = "translateY(0)";
    floatingSyncButton.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)";
  });
  
  // Add syncing functionality to the button
  floatingSyncButton.addEventListener("click", () => {
    // Visual feedback that sync is starting
    floatingSyncButton.textContent = "Syncing...";
    floatingSyncButton.disabled = true;
    floatingSyncButton.style.background = "linear-gradient(135deg, #cccccc, #bbbbbb)";
    floatingSyncButton.style.cursor = "not-allowed";
    
    // Remove existing icon
    if (floatingSyncButton.lastChild !== floatingSyncButton.firstChild && floatingSyncButton.lastChild) {
      floatingSyncButton.removeChild(floatingSyncButton.lastChild);
    }
    
    // Add spinning icon
    const loadingIcon = document.createElement("span");
    loadingIcon.textContent = " ⟳";
    loadingIcon.style.marginLeft = "5px";
    loadingIcon.style.display = "inline-block";
    loadingIcon.style.animation = "spin 1s linear infinite";
    floatingSyncButton.appendChild(loadingIcon);
    
    // Add animation style for the spinning icon
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleElement);
    
    // Start sync process
    chrome.storage.local.get(['lastSyncTime'], async (result) => {
      const lastSyncTime = result.lastSyncTime || 0;
      const currentTime = Date.now();
      
      chrome.runtime.sendMessage({
        action: "startSync",
        token: authToken,
        lastSyncTime: lastSyncTime
      }, (response) => {
        // Re-enable the button and update text
        floatingSyncButton.disabled = false;
        floatingSyncButton.style.cursor = "pointer";
        floatingSyncButton.style.background = "linear-gradient(135deg, #8a2be2, #9370db)";
        
        if (response && response.success) {
          floatingSyncButton.textContent = `Synced ${response.newPostsCount} posts`;
          
          // Update last sync time
          chrome.storage.local.set({ lastSyncTime: currentTime }, () => {
            console.log("[ED Extension] Updated last sync time");
          });
          
          // Reset button text after 3 seconds
          setTimeout(() => {
            floatingSyncButton.textContent = "Sync Now";
            // Re-add the icon
            const iconSpan = document.createElement("span");
            iconSpan.textContent = " 🔄";
            iconSpan.style.marginLeft = "5px";
            floatingSyncButton.appendChild(iconSpan);
          }, 3000);
        } else {
          floatingSyncButton.textContent = "Sync Failed";
          // Reset button text after 3 seconds
          setTimeout(() => {
            floatingSyncButton.textContent = "Sync Now";
            // Re-add the icon
            const iconSpan = document.createElement("span");
            iconSpan.textContent = " 🔄";
            iconSpan.style.marginLeft = "5px";
            floatingSyncButton.appendChild(iconSpan);
          }, 3000);
        }
      });
    });
  });
  
  document.body.appendChild(floatingSyncButton);
} 