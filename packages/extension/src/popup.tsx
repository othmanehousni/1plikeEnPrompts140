import { useEffect, useState } from "react";
import "./style.css";

function IndexPopup() {
	const [token, setToken] = useState<string>("Token non disponible");
	const [syncStatus, setSyncStatus] = useState<string>("");
	const [isSyncing, setIsSyncing] = useState(false);

	useEffect(() => {
		// Récupérer le token depuis le stockage local
		chrome.storage.local.get(["edAuthToken"], (result) => {
			if (result.edAuthToken) {
				setToken(result.edAuthToken);
			}
		});
	}, []);

	const startSync = async () => {
		try {
			setIsSyncing(true);
			setSyncStatus("Synchronisation en cours...");
			
			// Get the last sync time
			const storageData = await chrome.storage.local.get(["lastSyncTime"]);
			const lastSyncTime = storageData.lastSyncTime || 0;
			
			// Send a message to the background script to initiate syncing
			const response = await chrome.runtime.sendMessage({
				action: "startSync",
				token: token,
				lastSyncTime: lastSyncTime
			});
			
			if (response.success) {
				const currentTime = Date.now();
				setSyncStatus(`${response.newPostsCount} nouveaux posts synchronisés!`);
				
				// Update last sync time
				await chrome.storage.local.set({ lastSyncTime: currentTime });
				console.log("[ED Extension] Updated last sync time");
			} else {
				setSyncStatus(`Erreur: ${response.message || "Échec de la synchronisation"}`);
			}
		} catch (error) {
			console.error("[ED Extension] Error during sync:", error);
			setSyncStatus("Erreur de synchronisation. Veuillez réessayer.");
		} finally {
			setIsSyncing(false);
			// Reset status message after 3 seconds
			setTimeout(() => setSyncStatus(""), 3000);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				padding: 20,
				width: 320,
				background: "linear-gradient(135deg, #f5f5f5, #ffffff)",
				borderRadius: "10px",
				boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
				fontFamily: "system-ui, -apple-system, sans-serif",
			}}
		>
			<h2
				style={{
					margin: "0 0 16px 0",
					color: "#8a2be2",
					fontSize: "24px",
					fontWeight: "600",
					textAlign: "center",
					background: "linear-gradient(135deg, #8a2be2, #9370db)",
					WebkitBackgroundClip: "text",
					WebkitTextFillColor: "transparent",
				}}
			>
				ED Extension
			</h2>

			<div
				style={{
					padding: "12px",
					border: "1px solid #e0e0e0",
					borderRadius: "8px",
					marginBottom: "20px",
					wordBreak: "break-all",
					background: "rgba(255, 255, 255, 0.8)",
					maxHeight: "120px",
					overflow: "auto",
					boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
					fontSize: "14px",
					color: "#333",
					fontFamily: "monospace",
				}}
			>
				{token}
			</div>

			<button
				type="button"
				onClick={startSync}
				disabled={isSyncing}
				onFocus={(e) => {
					e.currentTarget.style.transform = "translateY(-2px)"
					e.currentTarget.style.boxShadow = "0 6px 12px rgba(138, 43, 226, 0.4)"
				}}
				onBlur={(e) => {
					e.currentTarget.style.transform = "translateY(0)"
					e.currentTarget.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)"
				}}
				onMouseOver={(e) => {
					e.currentTarget.style.transform = "translateY(-2px)"
					e.currentTarget.style.boxShadow = "0 6px 12px rgba(138, 43, 226, 0.4)"
				}}
				onMouseOut={(e) => {
					e.currentTarget.style.transform = "translateY(0)"
					e.currentTarget.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)"
				}}
				style={{
					padding: "10px 18px",
					background: isSyncing
						? "linear-gradient(135deg, #cccccc, #bbbbbb)"
						: "linear-gradient(135deg, #8a2be2, #9370db)",
					color: "white",
					border: "none",
					borderRadius: "30px",
					cursor: isSyncing ? "not-allowed" : "pointer",
					fontWeight: "600",
					fontSize: "15px",
					transition: "all 0.3s ease",
					boxShadow: "0 4px 8px rgba(138, 43, 226, 0.3)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{isSyncing ? "Synchronisation..." : "Synchroniser maintenant"} {isSyncing ? "⟳" : "🔄"}
			</button>
			
			{syncStatus && (
				<div
					style={{
						marginTop: "12px",
						padding: "8px 12px",
						borderRadius: "6px",
						backgroundColor: syncStatus.includes("Erreur") ? "#ffebee" : "#e8f5e9",
						color: syncStatus.includes("Erreur") ? "#c62828" : "#2e7d32",
						fontSize: "13px",
						textAlign: "center",
						transition: "all 0.3s ease",
					}}
				>
					{syncStatus}
				</div>
			)}

			<p
				style={{
					fontSize: "12px",
					color: "#666",
					marginTop: "20px",
					textAlign: "center",
					fontStyle: "italic",
				}}
			>
				Cliquez sur "Synchroniser maintenant" pour mettre à jour les posts.
			</p>
		</div>
	);
}

export default IndexPopup;
