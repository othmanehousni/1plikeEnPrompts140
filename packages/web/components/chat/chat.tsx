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

	// Animation variants for messages
	const messageVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	};

	return (
		<>
			{/* Course Selection Dropdown */}
			{edStemApiKey && courses.length > 0 && (
				<div className="relative mb-2" ref={dropdownRef}>
					<button
						type="button"
						onClick={() => setIsCoursesDropdownOpen(!isCoursesDropdownOpen)}
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

					{isCoursesDropdownOpen && (
						<div className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-white dark:bg-neutral-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
							<div className="py-1 max-h-48 overflow-auto">
								{courses.map((course) => (
									<button
										type="button"
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

			{/* Chat Messages */}
			<div className="flex flex-col gap-4 mb-4">
				<AnimatePresence>
					{messages.map((message) => (
						<motion.div
							key={message.id}
							variants={messageVariants}
							initial="hidden"
							animate="visible"
							exit="exit"
							className={`${message.role === 'user' ? 'text-neutral-500 dark:text-neutral-400 text-sm' : 'whitespace-pre-wrap font-mono text-sm text-neutral-800 dark:text-neutral-200'}`}
						>
							{message.role === 'user' ? (
								<div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">{message.content}</div>
							) : (
								<div className="space-y-2">
									{message.parts.map((part, i) => {
										const partId = `${message.id}-part-${i}`;
										
										switch (part.type) {
											case 'text':
												return (
													<motion.div 
														key={partId}
														initial={{ opacity: 0 }}
														animate={{ opacity: 1 }}
														transition={{ delay: i * 0.05 }}
														className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
													>
														{part.text}
													</motion.div>
												);
											
											case 'step-start':
												return i > 0 ? (
													<motion.div 
														key={partId} 
														initial={{ width: 0 }}
														animate={{ width: "100%" }}
														transition={{ duration: 0.5 }}
														className="text-neutral-500 dark:text-neutral-400"
													>
														<hr className="my-2 border-neutral-300 dark:border-neutral-700" />
													</motion.div>
												) : null;
											
											case 'tool-invocation': {
												const toolInvocation = part.toolInvocation;
												const callId = toolInvocation.toolCallId;
												
												// Handle different tools based on their name
												switch (toolInvocation.toolName) {
													case 'searchEdCourse': {
														switch (toolInvocation.state) {
															case 'partial-call':
																return (
																	<div key={partId} className="text-neutral-500 dark:text-neutral-400 text-xs my-1 italic">
																		<motion.div
																			initial={{ opacity: 0 }}
																			animate={{ opacity: 1 }}
																			transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, repeatType: "reverse" }}
																		>
																			Searching course content...
																		</motion.div>
																	</div>
																);
															case 'call':
																return (
																	<div key={partId} className="text-neutral-500 dark:text-neutral-400 text-xs my-1 italic">
																		Searching for: {toolInvocation.args.query}
																	</div>
																);
															case 'result':
																return (
																	<div key={partId}>
																		<SearchResults results={toolInvocation.result?.results || []} />
																	</div>
																);
														}
														break;
													}
													
													// Generic handler for other tool types
													default: {
														switch (toolInvocation.state) {
															case 'partial-call':
																return (
																	<div key={partId} className="text-neutral-500 dark:text-neutral-400 text-xs my-1 italic">
																		Using tool: {toolInvocation.toolName}...
																	</div>
																);
															case 'call':
																return (
																	<div key={partId} className="text-neutral-500 dark:text-neutral-400 text-xs my-1 italic">
																		Using tool: {toolInvocation.toolName} with args: {JSON.stringify(toolInvocation.args)}
																	</div>
																);
															case 'result':
																return (
																	<div key={partId} className="text-neutral-500 dark:text-neutral-400 text-xs my-1">
																		Tool result: {JSON.stringify(toolInvocation.result)}
																	</div>
																);
															default:
																return null;
														}
													}
												}
												return null;
											}

											default:
												return null;
										}
									})}
								</div>
							)}
						</motion.div>
					))}
				</AnimatePresence>

				{/* Loading Indicator */}
				{isLoading && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400"
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{
								repeat: Number.POSITIVE_INFINITY,
								duration: 1,
								ease: "linear",
							}}
						>
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
						</motion.div>
						<div className="text-sm">
							{isTranscribing ? "Transcribing..." : "Thinking..."}
						</div>
					</motion.div>
				)}
			</div>

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
		</>
	);
}
