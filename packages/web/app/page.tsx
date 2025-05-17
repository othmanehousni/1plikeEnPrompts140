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
			<div className="absolute top-4 left-4 font-mono text-sm text-neutral-500 dark:text-neutral-400">
				Last Sync:{" "}
				{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}
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
							? "bg-neutral-200 dark:bg-neutral-800"
							: "bg-transparent",
					)}
				>
					<div className="flex flex-col w-full justify-between gap-2">
						<Chat
							edStemApiKey={edStemApiKey || undefined}
							togetherApiKey={togetherApiKey || undefined}
							groqApiKey={groqApiKey || undefined}
							courses={courses}
							onError={showError}
							onSpeakMessage={handleSpeakMessage}
							isAutoTTSActive={isAutoTTSActive}
							isSpeaking={isSpeaking}
							onToggleAutoTTS={() => setIsAutoTTSActive(prev => !prev)}
							onMessagesChange={setIsExpanded}
						/>
					</div>
				</motion.div>
				<SettingsButton />
			</div>

			{mounted && (
				<div className="absolute bottom-4 left-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
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
		</div>
	);
}
