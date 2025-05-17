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

// Helper for STT
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
// Preferred MIME types for recording, in order of preference
const PREFERRED_AUDIO_FORMATS = [
	"audio/webm", // Webm is widely supported
	"audio/mp4", // Safari often supports this
	"audio/wav", // Raw PCM data
	"audio/ogg", // Firefox often supports thiso
];
let selectedAudioFormat =
	PREFERRED_AUDIO_FORMATS[PREFERRED_AUDIO_FORMATS.length - 1]; // Default to last one

// Combined sync button component
function SyncButton() {
	const [isSyncing, setIsSyncing] = useState(false);
	const { edStemApiKey, togetherApiKey } = useUserPreferences();
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

			// Include Together API key if available for generating embeddings
			const payload = {
				apiKey: edStemApiKey,
				...(togetherApiKey ? { togetherApiKey } : {}),
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
	const { togetherApiKey, groqApiKey, edStemApiKey } = useUserPreferences();
	const { lastSyncedAt } = useSyncStatus();
	const [mounted, setMounted] = useState<boolean>(false);
	const [currentTime, setCurrentTime] = useState<number>(0);

	// TTS State
	const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
	const [isAutoTTSActive, setIsAutoTTSActive] = useState<boolean>(false);
	const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

	// STT State
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

	// ED Course Selection State
	const [courses, setCourses] = useState<EDCourse[]>([]);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);
	const [hasMessages, setHasMessages] = useState<boolean>(false);
	const [courseLoadError, setCourseLoadError] = useState<string | null>(null);

	// Fonction utilitaire pour récupérer directement la clé API depuis le localStorage
	const getLatestEdStemApiKey = (): string | null => {
		// Vérifier si window est défini (pour éviter les erreurs côté serveur)
		if (typeof window === 'undefined') return null;
		
		try {
			// Le format dans lequel Zustand/persist stocke les données
			const storedPrefs = localStorage.getItem('user-preferences');
			if (!storedPrefs) return null;
			
			const parsed = JSON.parse(storedPrefs);
			return parsed?.state?.edStemApiKey || null;
		} catch (error) {
			console.error("Erreur lors de la récupération de la clé API depuis localStorage:", error);
			return null;
		}
	};

	// Function to fetch courses that can be called when API key changes
	const fetchCourses = async (useLatestToken = false) => {
		// Get the latest token directly from localStorage if requested
		const apiKey = useLatestToken 
			? getLatestEdStemApiKey() 
			: edStemApiKey;
			
		if (!apiKey) {
			showError("Aucune clé API EdStem trouvée. Veuillez d'abord ajouter votre clé dans les paramètres.");
			return;
		}
		
		try {
			setCourseLoadError(null);
			console.log("Fetching courses with API key:", apiKey.substring(0, 5) + "...");
			
			const response = await fetch("/api/edstem/courses", {
				headers: {
					"x-edstem-api-key": apiKey,
				},
			});
			
			if (!response.ok) {
				let errorMsg = `Error ${response.status}: Failed to fetch courses`;
				try {
					const errorData = await response.json();
					if (errorData.error) {
						errorMsg = errorData.error;
					}
				} catch (e) {
					// Parsing error, use default message
				}
				
				console.error("Course fetch error:", errorMsg);
				setCourseLoadError(errorMsg);
				// Show error notification instead of inline error
				showError(errorMsg);
				return;
			}
			
			const data = await response.json();
			if (data.courses && Array.isArray(data.courses)) {
				setCourses(data.courses);
				console.log(`Loaded ${data.courses.length} courses successfully`);
				setCourseLoadError(null);
				
				// Si nous avons chargé des cours avec succès, mais que la clé API dans l'état React est différente,
				// mettons à jour l'état avec la nouvelle clé
				if (useLatestToken && apiKey !== edStemApiKey) {
					console.log("Updating React state with latest API key from localStorage");
					useUserPreferences.getState().setEdStemApiKey(apiKey);
				}
			} else {
				const errorMsg = "No courses found or invalid response format";
				setCourseLoadError(errorMsg);
				showError(errorMsg);
			}
		} catch (error) {
			console.error("Error fetching courses:", error);
			const errorMsg = "Failed to connect to course API";
			setCourseLoadError(errorMsg);
			showError(errorMsg);
		}
	};

	useEffect(() => {
		setMounted(true);
		setCurrentTime(Date.now());

		// Vérifier s'il y a une clé API dans le localStorage, même si l'état React n'est pas encore mis à jour
		const storedApiKey = getLatestEdStemApiKey();
		const apiKeyToUse = edStemApiKey || storedApiKey;

		// Fetch last sync date on mount if we have an API key
		if (apiKeyToUse) {
			// Synchroniser l'état React avec la clé du localStorage si nécessaire
			if (storedApiKey && !edStemApiKey) {
				console.log("Mise à jour de l'état React avec la clé API du localStorage");
				useUserPreferences.getState().setEdStemApiKey(storedApiKey);
			}
			
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

			// Fetch courses with the current API key
			fetchCourses(true); // Utiliser toujours la dernière clé au chargement
		}
	}, [edStemApiKey]);

	// Set up a listener for apiKey changes to trigger course refresh
	useEffect(() => {
		// Create an observer for userPreferences store changes
		const unsubscribe = useUserPreferences.subscribe(
			(state, prevState) => {
				// Only refresh courses if the API key changed and is not empty
				if (state.edStemApiKey !== prevState.edStemApiKey && state.edStemApiKey) {
					console.log("EdStem API key changed, refreshing courses...");
					fetchCourses(true); // Use the latest token from the store
				}
			}
		);
		
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (!mounted) return;
		const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [mounted]);

	useEffect(() => {
		if (mounted) {
			if (!togetherApiKey && !groqApiKey) {
				showError(
					"Please add an API key (e.g., TogetherAI or Groq) in settings to use the app.",
				);
			}
			if (!edStemApiKey) {
				showError(
					"Please add your EdStem API key in settings to sync with your courses.",
				);
			}
		}
	}, [togetherApiKey, groqApiKey, edStemApiKey, showError, mounted]);

	const handleSpeakMessage = async (textToSpeak: string) => {
		if (!textToSpeak || isSpeaking) return;
		setIsSpeaking(true);
		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (groqApiKey) headers["x-groq-api-key"] = groqApiKey;

			const response = await fetch("/api/speech", {
				method: "POST",
				headers,
				body: JSON.stringify({ text: textToSpeak }),
			});
			if (!response.ok) {
				let errorMsg = "Failed to generate speech.";
				try {
					const errorData = await response.json();
					errorMsg = errorData.error || errorMsg;
				} catch (e) {
					errorMsg = `Speech API error: ${response.status}`;
				}
				showError(errorMsg);
				setIsSpeaking(false);
				return;
			}
			const audioBlob = await response.blob();
			const audioUrl = URL.createObjectURL(audioBlob);
			if (audioPlayerRef.current) {
				audioPlayerRef.current.src = audioUrl;
				audioPlayerRef.current.play().catch((err) => {
					showError("Could not play audio.");
					setIsSpeaking(false);
					URL.revokeObjectURL(audioUrl);
				});
				audioPlayerRef.current.onended = () => {
					setIsSpeaking(false);
					URL.revokeObjectURL(audioUrl);
				};
				audioPlayerRef.current.onerror = () => {
					showError("Audio player error.");
					setIsSpeaking(false);
					URL.revokeObjectURL(audioUrl);
				};
			} else {
				setIsSpeaking(false);
			}
		} catch (err) {
			showError("Error in speech handling.");
			console.error("TTS error:", err);
			setIsSpeaking(false);
		}
	};

	const handleMicPress = async () => {
		if (isRecording) {
			mediaRecorder?.stop();
			setIsRecording(false);
		} else {
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				showError("Audio recording is not supported by your browser.");
				return;
			}

			for (const format of PREFERRED_AUDIO_FORMATS) {
				if (MediaRecorder.isTypeSupported(format)) {
					selectedAudioFormat = format;
					console.log("[STT] Using audio format:", selectedAudioFormat);
					break;
				}
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				setIsRecording(true);
				audioChunks = [];
				mediaRecorder = new MediaRecorder(stream, {
					mimeType: selectedAudioFormat,
				});
				mediaRecorder.ondataavailable = (event) => {
					audioChunks.push(event.data);
				};
				mediaRecorder.onstop = async () => {
					for (const track of stream.getTracks()) {
						track.stop();
					}
					const audioBlob = new Blob(audioChunks, {
						type: selectedAudioFormat,
					});

					if (audioBlob.size === 0) {
						showError("No audio recorded. Please try again.");
						setIsTranscribing(false);
						return;
					}
					console.log(
						`[STT] Recorded audio blob size: ${audioBlob.size}, type: ${audioBlob.type}`,
					);

					setIsTranscribing(true);
					try {
						const headers: Record<string, string> = {};
						if (groqApiKey) headers["x-groq-api-key"] = groqApiKey;

						const response = await fetch("/api/transcribe", {
							method: "POST",
							headers,
							body: audioBlob,
						});
						if (!response.ok) {
							let errorMsg = "Failed to transcribe audio.";
							try {
								const errorData = await response.json();
								errorMsg =
									errorData.error ||
									`Transcription API Error: ${response.status}`;
								if (errorData.message) errorMsg += ` - ${errorData.message}`;
							} catch (e) {
								errorMsg = `Transcription API Error: ${response.status} - ${await response.text()}`;
							}
							showError(errorMsg);
						} else {
							const result = await response.json();
							if (result.transcription) {
								// This is handled via the Chat component now
								// setInput((prevInput) => prevInput + (prevInput ? " " : "") + result.transcription);
								showError(
									"Speech transcribed but input updating not implemented in this version",
								);
							} else if (result.error) {
								showError(result.error);
							}
						}
					} catch (transcribeError) {
						showError("Error during transcription. Check console.");
						console.error("STT fetch error:", transcribeError);
					} finally {
						setIsTranscribing(false);
					}
				};
				mediaRecorder.start();
			} catch (err) {
				showError(
					"Could not start recording. Check mic permissions or browser support for selected audio format.",
				);
				console.error("Mic access/MediaRecorder error:", err);
				setIsRecording(false);
			}
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
						padding: isExpanded ? 12 : 0,
					}}
					transition={{
						type: "spring",
						bounce: 0.5,
					}}
					className={cn(
						"rounded-lg w-full",
						isExpanded
							? "bg-muted dark:bg-muted"
							: "bg-transparent",
					)}
				>
					<div className="flex flex-col w-full justify-between gap-2">
						{/* Course loading status */}
						{edStemApiKey && courses.length === 0 && (
							<div className="bg-muted/50 dark:bg-muted/50 rounded-md p-3 text-sm text-center">
								{courseLoadError ? (
									<div className="text-red-500 dark:text-red-400">
										<p>No courses available</p>
										<button 
											onClick={() => fetchCourses(true)} 
											className="mt-2 text-xs underline text-primary"
										>
											Retry
										</button>
									</div>
								) : (
									<div className="flex flex-col items-center space-y-2">
										<div className="animate-spin">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												aria-hidden="true"
											>
												<path d="M21 12a9 9 0 1 1-6.219-8.56" />
											</svg>
										</div>
										<p>Loading courses...</p>
									</div>
								)}
							</div>
						)}
						
						<Chat
							edStemApiKey={edStemApiKey || undefined}
							togetherApiKey={togetherApiKey || undefined}
							groqApiKey={groqApiKey || undefined}
							courses={courses}
							onError={showError}
							onSpeakMessage={handleSpeakMessage}
							isAutoTTSActive={isAutoTTSActive}
							isSpeaking={isSpeaking}
							onToggleAutoTTS={() => setIsAutoTTSActive((prev) => !prev)}
							onMessagesChange={setIsExpanded}
							refreshCourses={() => fetchCourses(true)}
						/>
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

			{/* The audio element for playing speech. Hidden but accessible. */}
			<audio ref={audioPlayerRef} style={{ display: "none" }}>
				<track kind="captions" label="English captions" />
			</audio>
			<ToastContainer toasts={toasts} onDismiss={dismiss} />

			{/* Hidden component to access sync functionality */}
			<div className="hidden">
				<EdStemSyncButton data-edstem-sync />
			</div>
		</div>
	);
}
