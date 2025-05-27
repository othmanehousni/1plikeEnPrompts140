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
import { authClient } from "@/lib/auth-client";
import { useRevocationHandler } from "@/hooks/use-revocation-handler";

// Define a simple loading component (can be replaced with a more styled one)
const PageLoader = () => (
	<div className="flex h-screen w-screen items-center justify-center">
		<p className="text-lg text-muted-foreground">Loading...</p>
		{/* You can add a spinner icon here if desired */}
	</div>
);

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
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [authLoading, setAuthLoading] = useState<boolean>(true);

	// Initialize revocation handler
	useRevocationHandler();

	// ED Course Selection State
	const [courses, setCourses] = useState<EDCourse[]>([]);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	useEffect(() => {
		setMounted(true);
		setCurrentTime(Date.now());

		const checkAuthStatus = async () => {
			try {
				const session = await authClient.getSession();
				if (session?.data) {
					const userEmail = session.data.user?.email;
					if (userEmail) {
						const domain = userEmail.split('@')[1];
						console.log(`[CLIENT] Validating user domain: ${userEmail} -> ${domain}`);
						
						if (domain !== 'epfl.ch') {
							console.warn(`[CLIENT] ❌ Non-EPFL user detected: ${userEmail}`);
							
							// Force disconnect and redirect
							try {
								await authClient.signOut();
								localStorage.clear();
								sessionStorage.clear();
								window.location.href = '/revoked';
								return;
							} catch (error) {
								console.error('Error during forced disconnect:', error);
								window.location.reload();
								return;
							}
						} else {
							console.log(`[CLIENT] ✅ EPFL user validated: ${userEmail}`);
						}
					}
					setIsAuthenticated(true);
				} else {
					setIsAuthenticated(false);
				}
			} catch (error) {
				console.error("Error checking auth status:", error);
				setIsAuthenticated(false);
			} finally {
				setAuthLoading(false); // Auth check complete
			}
		};
		
		checkAuthStatus();
	}, []); // Run once on mount to check auth status

	// Fetch last sync date and courses only if authenticated and API key exists
	useEffect(() => {
		if (!authLoading && isAuthenticated && edStemApiKey) {
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
	}, [authLoading, isAuthenticated, edStemApiKey]);

	useEffect(() => {
		if (!mounted) return;
		const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [mounted]);

	useEffect(() => {
		if (mounted && !authLoading && !edStemApiKey && isAuthenticated) {
			showError(
				"Please add your EdStem API key in settings to sync with your courses.",
			);
		}
	}, [edStemApiKey, showError, mounted, authLoading, isAuthenticated]);

	const handleGoogleSignIn = async () => {
		try {
			await authClient.signIn.social({
				provider: "google"
				
			});

		} catch (error) {
			console.error("Google sign-in failed:", error);
			showError("Authentication failed. Please try again.");
		}
	};

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

	if (authLoading) {
		return <PageLoader />;
	}

	return (
		<div className="flex h-screen w-screen items-center justify-center relative">
			<div className="absolute top-4 left-4 flex flex-col gap-2">
				<div className="text-4xl font-bold text-primary dark:text-primary tracking-tight hover:opacity-80 transition-opacity cursor-default font-title-rounded">
					AskED
				</div>
			</div>

			{/* Theme Toggle Button and Sync Button - Top Right */}
			<div className="absolute top-4 right-17 flex items-center gap-7">
				{isAuthenticated && <SyncButton />}
				<ThemeToggle />
			</div>

			<div className="flex flex-col items-center w-full max-w-[800px]">
				<motion.div
					animate={{
						minHeight: isExpanded ? 200 : 0,
						width: isExpanded ? 800 : 800,
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
						{isAuthenticated ? (
							<Chat />
						) : (
							<div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg shadow-md bg-card">
								<h2 className="text-2xl font-semibold mb-3">Authentication Required</h2>
								<div className="text-muted-foreground mb-2">
									You must sign in with your EPFL Google account to use AskED.
								</div>
								<div className="text-muted-foreground font-medium mb-6">
									Only email addresses with <span className="text-primary">.epfl.ch</span> domain are allowed.
								</div>
								<Button onClick={handleGoogleSignIn} variant="default" className="w-full max-w-xs flex items-center justify-center gap-2">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 186.69 190.5" aria-hidden="true">
										<g transform="translate(1184.583 765.171)">
											<path d="M-1089.333-687.239v36.888h51.262c-2.251 11.863-9.006 21.908-19.137 28.662l30.913 23.986c18.011-16.625 28.402-41.044 28.402-70.052 0-6.754-.606-13.249-1.732-19.483z" fill="#4285f4"/>
											<path d="M-1142.714-651.791l-6.972 5.337-24.679 19.223h0c15.673 31.086 47.796 52.561 85.03 52.561 25.717 0 47.278-8.486 63.038-23.033l-30.913-23.986c-8.486 5.715-19.31 9.179-32.125 9.179-24.765 0-45.806-16.712-53.34-39.226z" fill="#34a853"/>
											<path d="M-1174.365-712.61c-6.494 12.815-10.217 27.276-10.217 42.689s3.723 29.874 10.217 42.689c0 .086 31.693-24.592 31.693-24.592-1.905-5.715-3.031-11.776-3.031-18.098s1.126-12.383 3.031-18.098z" fill="#fbbc05"/>
											<path d="M-1089.333-727.244c14.028 0 26.497 4.849 36.455 14.201l27.276-27.276c-16.539-15.413-38.013-24.852-63.731-24.852-37.234 0-69.359 21.388-85.032 52.561l31.692 24.592c7.533-22.514 28.575-39.226 53.34-39.226z" fill="#ea4335"/>
										</g>
									</svg>
									Sign in with Google
								</Button>
							</div>
						)}
					</div>
				</motion.div>
				{isAuthenticated && <SettingsButton />}
			</div>

			{mounted && (
				<div className="absolute bottom-4 left-4 font-mono text-xs text-muted-foreground">
					<div className="font-bold mb-1">Ask Ed</div>
					<div className="flex items-center gap-2">
					
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
