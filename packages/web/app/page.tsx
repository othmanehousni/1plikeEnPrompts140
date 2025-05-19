"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { useUserPreferences } from "@/lib/stores/user-preferences";
import { useSyncStatus } from "@/lib/stores/sync-status";
import type { EDCourse } from "@/types/schema/ed.schema";
import { SettingsButton } from "@/components/layout/settings/settings-button";
import Chat from "@/components/chat/chat";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { EdStemSyncButton } from "@/components/layout/settings/edstem-sync-button";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// Combined sync button component
function SyncButton() {
	const [isSyncing, setIsSyncing] = useState(false);
	const { edStemApiKey } = useUserPreferences();
	const {
		lastSyncedAt,
		setLastSyncedAt,
		setIsSyncing: setSyncingState,
		setError,
	} = useSyncStatus();
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
				const embedMessage = data.embeddings ? " with vector embeddings" : "";
				showError(
					`Success: Successfully synced ${data.count} courses${embedMessage}`,
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

export default function Home() {
	const { toasts, error: showError, dismiss } = useToast();
	const { edStemApiKey } = useUserPreferences();
	const { lastSyncedAt } = useSyncStatus();
	const [mounted, setMounted] = useState<boolean>(false);
	const [currentTime, setCurrentTime] = useState<number>(0);

	// ED Course Selection State
	const [courses, setCourses] = useState<EDCourse[]>([]);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	useEffect(() => {
		setMounted(true);
		setCurrentTime(Date.now());

		// Fetch last sync date on mount if we have an API key
		if (edStemApiKey) {
			const fetchLastSyncDate = async () => {
				try {
					const response = await fetch("/api/edstem/last-sync");
					if (response.ok) {
						const data = await response.json();
						if (data.lastSynced) {
							useSyncStatus.getState().setLastSyncedAt(data.lastSynced);
						}
					}
				} catch (error) {
					console.error("Error fetching last sync date:", error);
				}
			};

			fetchLastSyncDate();

			// Fetch available courses
			const fetchCourses = async () => {
				try {
					const response = await fetch("/api/edstem/courses", {
						headers: {
							"x-edstem-api-key": edStemApiKey,
						},
					});
					if (response.ok) {
						const data = await response.json();
						if (data.courses && Array.isArray(data.courses)) {
							setCourses(data.courses);
						}
					}
				} catch (error) {
					console.error("Error fetching courses:", error);
				}
			};

			fetchCourses();
		}
	}, [edStemApiKey]);

	useEffect(() => {
		if (!mounted) return;
		const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [mounted]);

	useEffect(() => {
		if (mounted && !edStemApiKey) {
			showError(
				"Please add your EdStem API key in settings to sync with your courses.",
			);
		}
	}, [edStemApiKey, showError, mounted]);

	const formattedTime = (() => {
		if (!mounted) return "";
		const date = new Date(currentTime);
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		const seconds = date.getSeconds().toString().padStart(2, "0");
		return `${hours}:${minutes}:${seconds}`;
	})();

	const formattedDate = (() => {
		if (!mounted) return "";
		const date = new Date(currentTime);
		const options: Intl.DateTimeFormatOptions = {
			month: "short",
			day: "numeric",
			year: "numeric",
		};
		return date.toLocaleDateString("en-US", options);
	})();

	return (
		<div className="flex h-screen w-screen items-center justify-center relative">
			<div className="absolute top-4 left-4 flex flex-col gap-2">
				<div className="text-4xl font-bold text-primary dark:text-primary tracking-tight hover:opacity-80 transition-opacity cursor-default font-title-rounded">
					AskED
				</div>
			</div>

			{/* Theme Toggle Button and Sync Button - Top Right */}
			<div className="absolute top-4 right-17 flex items-center gap-7">
				<SyncButton />
				<ThemeToggle />
			</div>

			<div className="flex flex-col items-center w-full max-w-[500px]">
				<motion.div
					animate={{
						minHeight: isExpanded ? 200 : 0,
						width: isExpanded ? 800 : 500,
						padding: isExpanded ? 12 : 0,
					}}
					transition={{
						type: "spring",
						bounce: 0.5,
					}}
					className={cn(
						"rounded-lg w-full",
						isExpanded ? "bg-muted dark:bg-muted" : "bg-transparent",
					)}
				>
					<div className="flex flex-col w-full justify-between gap-2">
						<Chat />
					</div>
				</motion.div>
				<SettingsButton />
			</div>

			{mounted && (
				<div className="absolute bottom-4 left-4 font-mono text-xs text-muted-foreground">
					<div className="font-bold mb-1">Ask Ed</div>
					<div className="flex items-center gap-2">
						<span>Lauzhack 2025</span>
						<span className="opacity-60">•</span>
						<div className="flex items-center gap-1">
							<span>{formattedDate}</span>
							<span className="text-xs opacity-60">@</span>
							<span className="font-medium">{formattedTime}</span>
						</div>
					</div>
				</div>
			)}

			<ToastContainer toasts={toasts} onDismiss={dismiss} />

			{/* Hidden component to access sync functionality */}
			<div className="hidden">
				<EdStemSyncButton data-edstem-sync />
			</div>
		</div>
	);
}
