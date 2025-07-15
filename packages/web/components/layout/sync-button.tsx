"use client";

import { useState } from "react";
import { useUserPreferences } from "@/lib/stores/user-preferences";
import { useSyncStatus } from "@/lib/stores/sync-status";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
	const [isSyncing, setIsSyncing] = useState(false);
	const { edStemApiKey } = useUserPreferences();
	const {
		setLastSyncedAt,
		setIsSyncing: setSyncingState,
		setError,
	} = useSyncStatus();
	const { lastSyncedAt } = useSyncStatus();
	const { error: showError } = useToast();

	const testConnection = async (apiKey: string): Promise<boolean> => {
		try {
			console.log("Testing EdStem API connection...");

			const response = await fetch("/api/edstem/test-connection", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ apiKey }),
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				console.error("Connection test failed:", data);
				const errorMessage = data.message || "Could not connect to EdStem API";
				showError(errorMessage);
				return false;
			}

			console.log("Connection test successful:", data);
			if (data.workingEndpoint) {
				console.log(`Found working endpoint: ${data.workingEndpoint}`);
			}

			return true;
		} catch (error) {
			console.error("Error testing connection:", error);
			return false;
		}
	};

	const handleSync = async () => {
		if (!edStemApiKey) {
			showError("Please add your EdStem API key first");
			return;
		}

		setIsSyncing(true);
		setSyncingState(true);

		try {
			// First test the connection
			const connectionSuccessful = await testConnection(edStemApiKey);
			if (!connectionSuccessful) {
				throw new Error(
					"Failed to connect to EdStem API. Please check your API key and try again.",
				);
			}

			console.log("Starting EdStem sync...");

			const payload = {
				apiKey: edStemApiKey,
			};

			const response = await fetch("/api/edstem/sync", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (!response.ok) {
				console.error("Sync error response:", data);
				let errorMessage =
					data.error || `Error ${response.status}: Failed to sync with EdStem`;

				// Handle specific errors with user-friendly messages
				if (data.error?.includes("401") || data.error?.includes("403")) {
					errorMessage =
						"Authentication failed. Please check your EdStem API key.";
				}

				throw new Error(errorMessage);
			}

			console.log("Sync successful:", data);

			if (data.lastSynced) {
				setLastSyncedAt(data.lastSynced);
			}

			setSyncingState(false);
			setError(null);

			// Show success message with course count if available
			if (data.count !== undefined) {
				const vectorMessage = data.vectorEnabled ? " with vector search enabled" : "";
				showError(
					`Success: Successfully synced ${data.count} courses${vectorMessage}`,
				);
			}
		} catch (err) {
			console.error("Sync error:", err);
			const errorMessage =
				err instanceof Error
					? err.message
					: "Unknown error occurred during sync";
			showError(errorMessage);
			setError(errorMessage);
		} finally {
			setIsSyncing(false);
			setSyncingState(false);
		}
	};

	return (
		<div className="relative group">
			<Button
				size="sm"
				variant="outline"
				onClick={handleSync}
				disabled={isSyncing || !edStemApiKey}
				className="gap-2"
			>
				<RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
				{isSyncing ? "Syncing..." : "Sync"}
			</Button>
			<div className="absolute top-full right-0 mt-2 bg-card/95 dark:bg-card/95 border rounded-md px-3 py-2 shadow-md text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10">
				Last Sync:{" "}
				{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}
			</div>
		</div>
	);
} 