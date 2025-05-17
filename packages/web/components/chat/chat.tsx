"use client";

import { ToolInvocation } from "ai";
import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
	CheckIcon,
	ChevronDownIcon,
	ExternalLinkIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { PromptInputWithActions } from "@/components/chat/input";
import type { EDCourse } from "@/types/schema/ed.schema";

interface SearchResult {
	id: string;
	title: string;
	content: string;
	similarity: number;
	metadata?: {
		source?: string;
		date?: string;
		url?: string;
		threadId?: string;
		answerId?: string;
		[key: string]: unknown;
	};
}

export interface ChatProps {
	edStemApiKey?: string;
	togetherApiKey?: string;
	groqApiKey?: string;
	courses?: EDCourse[];
	onError?: (message: string) => void;
	onSpeakMessage?: (text: string) => void;
	isAutoTTSActive?: boolean;
	isSpeaking?: boolean;
	onToggleAutoTTS?: () => void;
	onMessagesChange?: (hasMessages: boolean) => void;
}

// Search Result Item Component with expandable view
const SearchResultItem = ({ result, index }: { result: SearchResult; index: number }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	
	// Generate ED URL from metadata
	const generateEdUrl = () => {
		if (result.metadata?.url) return result.metadata.url;
		
		const courseId = result.metadata?.courseId;
		if (!courseId) return null;
		
		if (result.metadata?.source === 'thread' && result.metadata?.threadId) {
			return `https://edstem.org/courses/${courseId}/discussion/${result.metadata.threadId}`;
		}
		
		if (result.metadata?.source === 'answer' && result.metadata?.threadId && result.metadata?.answerId) {
			return `https://edstem.org/courses/${courseId}/discussion/${result.metadata.threadId}#${result.metadata.answerId}`;
		}
		
		return null;
	};
	
	const edUrl = generateEdUrl();
	
	const toggleExpand = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsExpanded(!isExpanded);
	};
	
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			setIsExpanded(!isExpanded);
		}
	};
	
	const handleLinkClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};
	
	const handleLinkKeyDown = (e: React.KeyboardEvent) => {
		e.stopPropagation();
	};
	
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.1 }}
			className={cn(
				"mb-2 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700",
				"hover:shadow-sm transition-all duration-200",
				isExpanded ? "bg-neutral-50 dark:bg-neutral-800" : "bg-white dark:bg-neutral-900"
			)}
		>
			<button 
				type="button"
				className="w-full text-left p-2 cursor-pointer flex justify-between items-start"
				onClick={toggleExpand}
				onKeyDown={handleKeyDown}
				aria-expanded={isExpanded}
			>
				<div className="flex-1">
					<h4 className="font-medium text-sm text-neutral-800 dark:text-neutral-200">
						{result.title}
					</h4>
					<div className="flex items-center gap-2 mt-1">
						<span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
							{result.metadata?.source || 'Unknown'}
						</span>
						<span className="text-xs text-neutral-500 dark:text-neutral-400">
							{result.metadata?.date 
								? new Date(result.metadata.date).toLocaleDateString() 
								: 'No date'}
						</span>
						<span className="text-xs text-green-600 dark:text-green-400 ml-auto">
							{Math.round(result.similarity * 100)}% match
						</span>
					</div>
				</div>
				
				<div className="flex items-center gap-1">
					{edUrl && (
						<div 
							className="ml-auto" 
							onClick={handleLinkClick} 
							onKeyDown={handleLinkKeyDown}
						>
							<a
								href={edUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="p-1 inline-block text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
								aria-label="Open in Ed"
							>
								<ExternalLinkIcon className="h-4 w-4" />
							</a>
						</div>
					)}
					<span
						className={cn(
							"p-1 transition-transform duration-200",
							isExpanded ? "rotate-180" : ""
						)}
						aria-hidden="true"
					>
						<ChevronDownIcon className="h-4 w-4" />
					</span>
				</div>
			</button>
			
			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3 }}
						className="overflow-hidden"
					>
						<div className="p-3 border-t border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
							{result.content}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};

// Animated Search Results Container
const SearchResults = ({ results }: { results: SearchResult[] }) => {
	if (!results.length) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="text-yellow-500 dark:text-yellow-400 text-xs my-1"
			>
				No results found for your search.
			</motion.div>
		);
	}
	
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="my-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md text-xs"
		>
			<h3 className="font-bold mb-2 flex items-center">
				<span className="mr-2">Search Results</span>
				<span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
					{results.length}
				</span>
			</h3>
			<div className="space-y-2">
				{results.map((result, index) => (
					<SearchResultItem 
						key={`result-${result.id || index}`} 
						result={result} 
						index={index} 
					/>
				))}
			</div>
		</motion.div>
	);
};

// Loading spinner component
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

// Loading indicator component
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
					<div className="animate-spin text-muted-foreground">
						<LoadingSpinner />
					</div>
					<div className="text-muted-foreground text-sm">
						{displayName}{displayName ? "..." : ""}
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};

// Assistant message component
const AssistantMessage = ({ message }: { message: { id: string; content: string } }) => {
	if (!message) return null;
	const [displayedContent, setDisplayedContent] = useState("");

	useEffect(() => {
		setDisplayedContent(""); // Reset when message changes
		let index = 0;
		let timeoutId: NodeJS.Timeout | null = null;

		const typeCharacter = () => {
			if (index < message.content.length) {
				setDisplayedContent((prev) => prev + message.content[index]);
				index++;
				const randomDelay = Math.random() * 25;
				timeoutId = setTimeout(typeCharacter, randomDelay);
			} else {
				if (timeoutId) clearTimeout(timeoutId);
			}
		};

		if (message.content) {
			typeCharacter();
		}

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}; // Cleanup on component unmount or message change
	}, [message.content, message.id]); // Depend on message.content and message.id

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={message.id}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="whitespace-pre-wrap font-mono text-sm text-foreground overflow-hidden"
			>
				{displayedContent}
			</motion.div>
		</AnimatePresence>
	);
};

export default function Chat({
	edStemApiKey,
	togetherApiKey,
	groqApiKey,
	courses = [],
	onError,
	onSpeakMessage,
	isAutoTTSActive = false,
	isSpeaking = false,
	onToggleAutoTTS,
	onMessagesChange,
}: ChatProps) {
	// State for course selection
	const [selectedCourse, setSelectedCourse] = useState<EDCourse | null>(
		courses.length > 0 ? courses[0] : null,
	);
	const [isCoursesDropdownOpen, setIsCoursesDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

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

	const {
		messages,
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		isLoading,
		error,
		addToolResult,
	} = useChat({
		headers: {
			"x-together-api-key": togetherApiKey || "",
			"x-groq-api-key": groqApiKey || "",
		},
		body: {
			selectedCourseId: selectedCourse?.id
				? String(selectedCourse.id)
				: undefined,
		},
		maxSteps: 5,
		onToolCall({ toolCall }) {
			// Auto-execute client-side tools if needed
			return null;
		},
		onError: (err) => {
			if (onError) {
				try {
					if (typeof err === "object" && err.message) {
						const errorData = JSON.parse(err.message);
						if (errorData.error) {
							onError(errorData.error);
							return;
						}
					}
				} catch (e) {
					// Not a JSON error
				}
				onError(err.message || "An unknown error occurred");
			}
		},
		onFinish: (message) => {
			// Speak message if auto TTS is active
			if (
				message.role === "assistant" &&
				isAutoTTSActive &&
				message.content &&
				onSpeakMessage
			) {
				const textContent = message.parts
					?.filter((part) => part.type === "text")
					.map((part) => (part.type === "text" ? part.text : ""))
					.join(" ");

				if (textContent) {
					onSpeakMessage(textContent);
				} else if (message.content) {
					onSpeakMessage(message.content);
				}
			}
		},
	});

	// Get the latest messages for display
	const userQuery = messages.filter(m => m.role === 'user').slice(-1)[0];
	const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];
	const currentToolCall = isLoading ? "Thinking" : undefined;
	const awaitingResponse = isLoading && !currentToolCall;

	const handleMicPress = () => {
		setIsRecording((prev) => !prev);
		// This is a stub - actual implementation would be handled in the parent component
	};

	const handleChatSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
		if (e) e.preventDefault();

		if (!edStemApiKey) {
			if (onError) onError("Please add your EdStem API key in settings first.");
			return;
		}

		if (!selectedCourse) {
			if (onError) onError("Please select a course first.");
			return;
		}

		handleSubmit(e);
	};

	// Notify parent about message changes
	useEffect(() => {
		if (onMessagesChange) {
			onMessagesChange(messages.length > 0);
		}
	}, [messages, onMessagesChange]);

	return (
		<>
			{/* Course Selection Dropdown */}
			{edStemApiKey && courses.length > 0 && (
				<div className="relative mb-2" ref={dropdownRef}>
					<button
						type="button"
						onClick={() => setIsCoursesDropdownOpen(!isCoursesDropdownOpen)}
						className={cn(
							"flex items-center justify-between w-full px-3 py-1.5 text-sm rounded-md transition-colors",
							"bg-card hover:bg-card/80 dark:bg-card dark:hover:bg-card/80"
						)}
					>
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground">Course:</span>
							<span className="truncate max-w-[300px] text-primary dark:text-primary">
								{selectedCourse
									? `${selectedCourse.code || ""} ${selectedCourse.name || ""}`.trim()
									: "Select a course"}
							</span>
						</div>
						<ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
					</button>

					{isCoursesDropdownOpen && (
						<div className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-card dark:bg-card ring-1 ring-border dark:ring-border focus:outline-none">
							<div className="py-1 max-h-48 overflow-auto">
								{courses.map((course) => (
									<button
										type="button"
										key={course.id}
										className={cn(
											"flex items-center justify-between w-full px-4 py-2 text-sm transition-colors",
											"hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary dark:hover:text-primary",
											selectedCourse?.id === course.id
												? "bg-primary/20 text-primary font-semibold dark:text-primary"
												: "text-foreground"
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
											<CheckIcon className="h-4 w-4 text-primary dark:text-primary" />
										)}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Input Form */}
			<PromptInputWithActions
				value={input}
				onValueChange={setInput}
				onSubmit={handleChatSubmit}
				isLoading={isLoading || isTranscribing}
				onSpeakPress={() => {
					const lastAssistantMessage = messages
						.filter((m) => m.role === "assistant")
						.slice(-1)[0];
					if (lastAssistantMessage && onSpeakMessage) {
						const textContent = lastAssistantMessage.parts
							?.filter((part) => part.type === "text")
							.map((part) => (part.type === "text" ? part.text : ""))
							.join(" ");

						if (textContent) {
							onSpeakMessage(textContent);
						} else if (lastAssistantMessage.content) {
							onSpeakMessage(lastAssistantMessage.content);
						}
					}
				}}
				isSpeaking={isSpeaking}
				speakButtonDisabled={
					!messages.some((m) => m.role === "assistant") ||
					isLoading ||
					isSpeaking ||
					isRecording
				}
				isAutoTTSActive={isAutoTTSActive}
				onToggleAutoTTS={onToggleAutoTTS}
				onMicPress={handleMicPress}
				isRecording={isRecording}
				micButtonDisabled={isLoading || isSpeaking || isTranscribing}
			/>

			{/* Messages Display */}
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
								<div className="text-muted-foreground text-sm w-fit mb-1">
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
								<div className="text-muted-foreground text-sm w-fit mb-1">
									{userQuery.content}
								</div>
							)}
							<AssistantMessage message={lastAssistantMessage} />
						</div>
					) : null}
				</AnimatePresence>
			</motion.div>
		</>
	);
}
