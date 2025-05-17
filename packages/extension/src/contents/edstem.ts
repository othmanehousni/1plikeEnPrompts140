console.log("[ED Extension] Content script is running");

const authToken = localStorage.getItem("authToken");

console.log("[ED Extension] Auth token:", authToken);

if (authToken) {
	// Store in local storage for persistence
	chrome.storage.local.set(
		{
			edAuthToken: authToken,
			lastSyncTime: chrome.storage.local.get(["lastSyncTime"], (result) => {
				return result.lastSyncTime || Date.now();
			}),
		},
		() => {
			console.log("[ED Extension] Token stored in chrome.storage.local");
		},
	);

	// Create a sync button in bottom right
	const floatingSyncButton = document.createElement("button");
	floatingSyncButton.textContent = "Sync Now";
	floatingSyncButton.style.position = "fixed";
	floatingSyncButton.style.bottom = "20px";
	floatingSyncButton.style.right = "20px";
	floatingSyncButton.style.zIndex = "9999";
	floatingSyncButton.style.padding = "10px 15px";
	floatingSyncButton.style.background =
		"linear-gradient(135deg, #8a2be2, #9370db)";
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
		floatingSyncButton.style.background =
			"linear-gradient(135deg, #cccccc, #bbbbbb)";
		floatingSyncButton.style.cursor = "not-allowed";

		// Remove existing icon
		if (
			floatingSyncButton.lastChild !== floatingSyncButton.firstChild &&
			floatingSyncButton.lastChild
		) {
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
		chrome.storage.local.get(["lastSyncTime"], async (result) => {
			const lastSyncTime = result.lastSyncTime || 0;
			const currentTime = Date.now();

			chrome.runtime.sendMessage(
				{
					action: "startSync",
					token: authToken,
					lastSyncTime: lastSyncTime,
				},
				(response) => {
					// Re-enable the button and update text
					floatingSyncButton.disabled = false;
					floatingSyncButton.style.cursor = "pointer";
					floatingSyncButton.style.background =
						"linear-gradient(135deg, #8a2be2, #9370db)";

					if (response?.success) {
						floatingSyncButton.textContent = `Synced ${response?.newPostsCount} posts`;

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
				},
			);
		});
	});

	document.body.appendChild(floatingSyncButton);
}
