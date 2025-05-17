"use client";

import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { PromptInputWithActions } from "@/components/chat/input";
import { SettingsButton } from "@/components/layout/settings/settings-button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { useUserPreferences } from "@/lib/stores/user-preferences";
import { useSyncStatus } from "@/lib/stores/sync-status";
import type { EDCourse } from "@/types/schema/ed.schema";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";

// Helper for STT
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
// Preferred MIME types for recording, in order of preference
const PREFERRED_AUDIO_FORMATS = [
	"audio/webm", // Webm is widely supported
	"audio/mp4", // Safari often supports this
	"audio/wav", // Raw PCM data
	"audio/ogg", // Firefox often supports this
];
let selectedAudioFormat =
	PREFERRED_AUDIO_FORMATS[PREFERRED_AUDIO_FORMATS.length - 1]; // Default to last one

export default function Home() {
	const [toolCall, setToolCall] = useState<string>();
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
	const [selectedCourse, setSelectedCourse] = useState<EDCourse | null>(null);
	const [isCoursesDropdownOpen, setIsCoursesDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

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
							if (data.courses.length > 0) {
								setSelectedCourse(data.courses[0]);
							}
						}
					}
				} catch (error) {
					console.error("Error fetching courses:", error);
				}
			};

			fetchCourses();
		}
	}, [edStemApiKey]);

	// Handle clicking outside the dropdown to close it
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsCoursesDropdownOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		if (!mounted) return;
		const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [mounted]);

	const { messages, input, setInput, handleSubmit, isLoading, error, append } =
		useChat({
			headers: {
				"x-together-api-key": togetherApiKey || "",
				"x-groq-api-key": groqApiKey || "",
			},
			body: {
				selectedCourseId: selectedCourse?.id,
			},
			onToolCall({ toolCall }) {
				setToolCall(toolCall.toolName);
			},
			onError: (err) => {
				console.error("Chat error:", err);
				try {
					if (typeof err === "object" && err.message) {
						const errorData = JSON.parse(err.message);
						if (errorData.error) {
							showError(errorData.error);
							return;
						}
					}
				} catch (e) {
					// Not a JSON error
				}
				if (err.message?.includes("rate limit")) {
					showError("You've been rate limited, please try again later!");
				} else if (err.message?.includes("api key")) {
					showError(
						"Missing API key. Please add your TogetherAI API key in settings.",
					);
				} else if (err.message?.toLowerCase().includes("failed to fetch")) {
					showError(
						"Network error: Failed to connect. Please check your connection and try again.",
					);
				} else if (err.message) {
					showError(err.message);
				} else {
					showError("An unknown error occurred. Please try again later!");
				}
			},
			onFinish: (message) => {
				if (
					message.role === "assistant" &&
					isAutoTTSActive &&
					message.content
				) {
					handleSpeakMessage(message.content);
				}
			},
		});

	const [isExpanded, setIsExpanded] = useState<boolean>(false);

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

	useEffect(() => {
		if (messages.length > 0) setIsExpanded(true);
		else setIsExpanded(false);
	}, [messages]);

	const currentToolCall = useMemo(() => {
		const tools = messages?.slice(-1)[0]?.toolInvocations;
		if (tools && toolCall === tools[0]?.toolName) {
			return tools[0].toolName;
		}
		return undefined;
	}, [toolCall, messages]);

	const awaitingResponse = useMemo(() => {
		if (
			isLoading &&
			currentToolCall === undefined &&
			messages.slice(-1)[0]?.role === "user"
		) {
			return true;
		}
		return false;
	}, [isLoading, currentToolCall, messages]);

	const userQuery = messages.filter((m) => m.role === "user").slice(-1)[0];

	const lastAssistantMessage = messages
		.filter((m) => m.role === "assistant")
		.slice(-1)[0];

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
								setInput(
									(prevInput) =>
										prevInput + (prevInput ? " " : "") + result.transcription,
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

	const formattedTime = useMemo(() => {
		if (!mounted) return "";
		const date = new Date(currentTime);
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		const seconds = date.getSeconds().toString().padStart(2, "0");
		return `${hours}:${minutes}:${seconds}`;
	}, [currentTime, mounted]);

	const formattedDate = useMemo(() => {
		if (!mounted) return "";
		const date = new Date(currentTime);
		const options: Intl.DateTimeFormatOptions = {
			month: "short",
			day: "numeric",
			year: "numeric",
		};
		return date.toLocaleDateString("en-US", options);
	}, [currentTime, mounted]);

	const handleChatSubmit = (e?: FormEvent<HTMLFormElement>) => {
		if (e) e.preventDefault();

		// Block submission if edStemApiKey is missing
		if (!edStemApiKey) {
			showError("Please add your EdStem API key in settings first.");
			return;
		}

		handleSubmit(e);
	};

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
						{/* Course Selection Dropdown */}
						{edStemApiKey && (
							<div className="relative" ref={dropdownRef}>
								<button
									onClick={() =>
										setIsCoursesDropdownOpen(!isCoursesDropdownOpen)
									}
									className={cn(
										"flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md",
										"bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200",
										"hover:bg-neutral-400 dark:hover:bg-neutral-600 transition-colors",
									)}
								>
									<div className="flex items-center gap-2">
										<span className="text-xs opacity-70">Course:</span>
										<span className="truncate max-w-[300px]">
											{selectedCourse
												? `${selectedCourse.code || ""} ${selectedCourse.name || ""}`.trim()
												: "Select a course"}
										</span>
									</div>
									<ChevronDownIcon className="h-4 w-4" />
								</button>

								{isCoursesDropdownOpen && courses.length > 0 && (
									<div className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-white dark:bg-neutral-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
										<div className="py-1 max-h-48 overflow-auto">
											{courses.map((course) => (
												<button
													key={course.id}
													className={cn(
														"flex items-center justify-between w-full px-4 py-2 text-sm",
														"hover:bg-neutral-200 dark:hover:bg-neutral-700",
														selectedCourse?.id === course.id
															? "bg-neutral-300 dark:bg-neutral-600"
															: "",
													)}
													onClick={() => {
														setSelectedCourse(course);
														setIsCoursesDropdownOpen(false);
													}}
												>
													<span className="truncate">
														{course.code} {course.name}
													</span>
													{selectedCourse?.id === course.id && (
														<CheckIcon className="h-4 w-4" />
													)}
												</button>
											))}
										</div>
									</div>
								)}
							</div>
						)}

						<PromptInputWithActions
							value={input}
							onValueChange={setInput}
							onSubmit={handleChatSubmit}
							isLoading={isLoading || isTranscribing}
							onSpeakPress={() =>
								lastAssistantMessage?.content &&
								handleSpeakMessage(lastAssistantMessage.content)
							}
							isSpeaking={isSpeaking}
							speakButtonDisabled={
								!lastAssistantMessage?.content ||
								isLoading ||
								isSpeaking ||
								isRecording
							}
							isAutoTTSActive={isAutoTTSActive}
							onToggleAutoTTS={() => setIsAutoTTSActive((prev) => !prev)}
							onMicPress={handleMicPress}
							isRecording={isRecording}
							micButtonDisabled={isLoading || isSpeaking || isTranscribing}
						/>
						<motion.div
							transition={{
								type: "spring",
							}}
							className="min-h-fit flex flex-col gap-2"
						>
							<AnimatePresence>
								{awaitingResponse || currentToolCall || isTranscribing ? (
									<div className="px-2 min-h-12">
										{userQuery && !isTranscribing && (
											<div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
												{userQuery.content}
											</div>
										)}
										<Loading
											tool={
												isTranscribing ? "Transcribing..." : currentToolCall
											}
										/>
									</div>
								) : lastAssistantMessage ? (
									<div className="px-2 min-h-12">
										{userQuery && (
											<div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
												{userQuery.content}
											</div>
										)}
										<AssistantMessage message={lastAssistantMessage} />
									</div>
								) : null}
							</AnimatePresence>
						</motion.div>
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

			{/* The audio element for playing speech. Hidden but accessible.
				Note: We're adding a track element for accessibility compliance,
				though for dynamically generated audio content, real-time captions
				would require additional speech-to-text processing.
			*/}
			<audio ref={audioPlayerRef} style={{ display: "none" }}>
				<track kind="captions" label="English captions" />
			</audio>
			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</div>
	);
}

const AssistantMessage = ({ message }: { message: Message }) => {
	if (!message) return null;

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={message.id}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="whitespace-pre-wrap font-mono text-sm text-neutral-800 dark:text-neutral-200 overflow-hidden"
			>
				{message.content}
			</motion.div>
		</AnimatePresence>
	);
};

const Loading = ({ tool }: { tool?: string }) => {
	const toolDisplayNames: Record<string, string> = {
		getInformation: "Getting information",
		addResource: "Adding information",
		understandQuery: "Understanding query",
		Transcribing: "Transcribing...",
	};
	const defaultToolName = tool === "Transcribing..." ? "" : "Thinking";

	const displayName =
		tool && toolDisplayNames[tool]
			? toolDisplayNames[tool]
			: tool || defaultToolName;

	return (
		<AnimatePresence mode="wait">
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ type: "spring" }}
				className="overflow-hidden flex justify-start items-center"
			>
				<div className="flex flex-row gap-2 items-center">
					<div className="animate-spin dark:text-neutral-400 text-neutral-500">
						<LoadingSpinner />
					</div>
					<div className="text-neutral-500 dark:text-neutral-400 text-sm">
						{displayName}
						{displayName ? "..." : ""}
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};

const LoadingSpinner = () => (
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
);
