"use client";

import { ToolInvocation } from "ai";
import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
// Let's temporarily use a type assertion to work around framer-motion dependency issue
// @ts-ignore
import { AnimatePresence, motion } from "framer-motion";
import {
	CheckIcon,
	ChevronDownIcon,
	ExternalLinkIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { PromptInputWithActions } from "@/components/chat/input";
import type { EDCourse } from "@/types/schema/ed.schema";

// Add CSS animation style
const sidebarAnimation = {
	hidden: { opacity: 0, x: 50 },
	visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

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
		let currentText = "";  // Track the text locally to avoid race conditions

		const typeCharacter = () => {
			if (index < message.content.length) {
				currentText += message.content[index];  // Add character to local variable
				setDisplayedContent(currentText);  // Set state with complete string
				index++;
				const randomDelay = Math.floor(Math.random() * 25) + 1; // Ensures delay is between 1-25ms
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

// Sidebar Sources Component to display top 3 most similar threads
const SidebarSources = ({ results }: { results: SearchResult[] }) => {
	const topResults = results
		.sort((a, b) => b.similarity - a.similarity)
		.slice(0, 3);
	
	if (!topResults.length) return null;
	
	return (
		<motion.div 
			className="fixed right-6 top-1/3 w-64 space-y-2 z-20"
			initial="hidden"
			animate="visible"
			variants={sidebarAnimation}
		>
			<h3 className="text-xs font-bold mb-1 text-foreground flex items-center">
				<span>Referenced Threads</span>
				<span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
					{topResults.length}
				</span>
			</h3>
			{topResults.map((result, index) => {
				const courseId = result.metadata?.courseId;
				const threadId = result.metadata?.threadId;
				const url = courseId && threadId 
					? `https://edstem.org/eu/courses/${courseId}/discussion/${threadId}`
					: result.metadata?.url;
					
				if (!url) return null;
				
				// Check if this is a thread ID result with a generic title
				const isThreadIdResult = result.title.includes("Thread #") && result.metadata?.threadId;
				
				return (
					<motion.a
						key={`sidebar-source-${index}`}
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="block p-3 bg-card dark:bg-card rounded-md border border-border dark:border-border hover:shadow-md transition-all duration-200 text-xs hover:bg-primary/5 dark:hover:bg-primary/10"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: index * 0.1 }}
					>
						<div className="font-medium text-foreground dark:text-foreground">
							{isThreadIdResult ? (
								<span>
									Thread <span className="text-primary">#{result.metadata?.threadId}</span>
								</span>
							) : (
								<span className="truncate block">{result.title}</span>
							)}
						</div>
						<div className="mt-1 text-muted-foreground dark:text-muted-foreground truncate">
							{isThreadIdResult ? "Click to view on Ed Discussion" : (result.metadata?.source || 'Thread')}
						</div>
						<div className="mt-1 flex justify-between items-center">
							<span className="text-primary dark:text-primary underline text-[10px]">
								View on Ed Discussion
							</span>
							<span className="text-primary/80 dark:text-primary/80">
								{Math.round(result.similarity * 100)}%
							</span>
						</div>
					</motion.a>
				);
			})}
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

	// State for search results
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	
	// Debug log to trace search results
	useEffect(() => {
		if (searchResults.length > 0) {
			console.log("Search results available:", searchResults);
		}
	}, [searchResults]);

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

	// Capture original fetch to intercept API calls
	useEffect(() => {
		const originalFetch = window.fetch;
		
		window.fetch = async function(...args) {
			const [resource, config] = args;
			
			// Check if this is a search API call
			if (typeof resource === 'string' && 
				(resource.includes('/api/ai/search') || 
				 resource.includes('/api/edstem') || 
				 resource.includes('/search'))) {
				
				console.log('Intercepted search API call:', resource);
				
				try {
					// Let the original fetch proceed
					const response = await originalFetch.apply(this, args);
					
					// Clone the response to read its body
					const clone = response.clone();
					const responseBody = await clone.json();
					
					console.log('Search API response:', responseBody);
					
					// Process the search results
					if (responseBody && Array.isArray(responseBody)) {
						// Direct array of results
						processSearchResults(responseBody);
					} else if (responseBody && responseBody.results && Array.isArray(responseBody.results)) {
						// Results nested in a results property
						processSearchResults(responseBody.results);
					} else if (responseBody && responseBody.data && Array.isArray(responseBody.data)) {
						// Results nested in a data property
						processSearchResults(responseBody.data);
					}
					
					return response; // Return the original response
				} catch (error) {
					console.error('Error intercepting search API:', error);
				}
			}
			
			// Default case: just use the original fetch
			return originalFetch.apply(this, args);
		};
		
		// Helper function to process search results
		const processSearchResults = (results: any[]) => {
			console.log('Processing search results:', results);
			
			if (results.length > 0) {
				// Try to map the results to our SearchResult type
				const mappedResults = results.map((result, index) => {
					// Different APIs might have different field names
					const id = result.id || result.threadId || `search-result-${index}`;
					const title = result.title || result.name || result.subject || result.text || `Result ${index + 1}`;
					const content = result.content || result.body || result.text || result.snippet || 'Click to view thread details';
					const courseId = result.courseId || result.course_id || (result.metadata ? result.metadata.courseId : null) || selectedCourse?.id;
					const threadId = result.threadId || result.thread_id || (result.metadata ? result.metadata.threadId : null) || id;
					const similarity = result.similarity || result.score || result.relevance || (0.9 - index * 0.05);
					
					return {
						id: String(id),
						title: String(title),
						content: String(content),
						similarity: Number(similarity),
						metadata: {
							source: 'thread',
							courseId: String(courseId),
							threadId: String(threadId),
							url: result.url
						}
					};
				});
				
				console.log('Mapped search results:', mappedResults);
				setSearchResults(mappedResults);
			}
		};
		
		// Cleanup function to restore original fetch
		return () => {
			window.fetch = originalFetch;
		};
	}, [selectedCourse]);

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
		onToolCall(toolInfo) {
			// Handle search results for AI tools
			const toolCall = toolInfo.toolCall;
			
			console.log('Tool called:', toolCall);
			
			// Check for search results using a safer approach
			try {
				// @ts-ignore - Working around type issues with the toolCall interface
				if (toolCall && typeof toolCall === 'object') {
					// @ts-ignore
					const toolName = toolCall.tool || toolCall.name || toolCall.type;
					// @ts-ignore
					const toolData = toolCall.input || toolCall.arguments || toolCall.result || toolCall.content;
					
					console.log(`Tool ${toolName} called with data:`, toolData);
					
					// Look for search tool calls
					if (toolName === 'search' || toolName === 'search_ed' || toolName === 'searchEd' || 
						toolName === 'search_threads' || toolName.includes('search')) {
						
						console.log('Search tool detected:', toolName);
						
						let searchData;
						if (typeof toolData === 'string') {
							try {
								searchData = JSON.parse(toolData);
							} catch (e) {
								// If it's a string but not valid JSON, it might be a search query
								console.log('Tool data is not valid JSON, might be a search query:', toolData);
							}
						} else if (typeof toolData === 'object') {
							searchData = toolData;
						}
						
						if (Array.isArray(searchData)) {
							console.log('Found search results array:', searchData);
							setSearchResults(searchData);
						} else if (searchData && typeof searchData === 'object' && (searchData.results || searchData.data)) {
							const resultArray = searchData.results || searchData.data;
							if (Array.isArray(resultArray)) {
								console.log('Found search results in object:', resultArray);
								setSearchResults(resultArray);
							}
						}
					}
				}
			} catch (e) {
				console.error('Error processing tool call:', e);
			}
			
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
			
			// Look for thread IDs in bracket format [XXXXX] in the new message
			if (message.role === "assistant" && message.content) {
				const content = message.content;
				console.log("Checking finished message for thread IDs:", content.substring(0, 150) + "...");
				
				// Extract thread IDs in bracket format [XXXXX]
				const threadIdBracketPattern = /\[(\d{5,})\]/g;
				const bracketMatches: string[] = [];
				let bracketMatch;
				
				while ((bracketMatch = threadIdBracketPattern.exec(content)) !== null) {
					if (bracketMatch[1] && !bracketMatches.includes(bracketMatch[1])) {
						bracketMatches.push(bracketMatch[1]);
					}
				}
				
				// If we found bracketed thread IDs and there's at least one match
				if (bracketMatches.length > 0) {
					console.log("Found thread IDs in brackets:", bracketMatches);
					
					// Create results from the thread IDs
					const bracketResults = bracketMatches.map((threadId, idx) => ({
						id: `bracket-thread-${idx}`,
						title: `Thread #${threadId}`,
						content: 'Referenced in the response',
						similarity: 0.95 - (idx * 0.05),
						metadata: {
							source: 'thread',
							courseId: selectedCourse?.id ? String(selectedCourse.id) : '0',
							threadId: threadId
						}
					}));
					
					console.log("Created results from bracketed thread IDs:", bracketResults);
					setSearchResults(bracketResults);
				}
			}
		},
	});

	// Detect search results in message content on message changes
	useEffect(() => {
		// Look for thread IDs in every message update
		if (!messages.length) return;
		
		// Get the last assistant message
		const lastAssistantMessage = messages
			.filter(m => m.role === "assistant")
			.slice(-1)[0];
			
		if (!lastAssistantMessage || !lastAssistantMessage.content) return;
		
		const content = lastAssistantMessage.content;
		console.log("Checking message for thread IDs:", content.substring(0, 150) + "...");
		
		// Check for Ed links first
		const edLinkPattern = /https:\/\/edstem\.org\/(?:eu\/)?courses\/(\d+)\/discussion\/(\d+)/g;
		const edLinks: SearchResult[] = [];
		let linkMatch;
		
		while ((linkMatch = edLinkPattern.exec(content)) !== null) {
			edLinks.push({
				id: `link-${edLinks.length}`,
				title: `Ed Thread ${linkMatch[2]}`,
				content: 'Direct link in response',
				similarity: 0.98 - (edLinks.length * 0.03),
				metadata: {
					source: 'thread',
					courseId: linkMatch[1],
					threadId: linkMatch[2],
					url: linkMatch[0]
				}
			});
		}
		
		if (edLinks.length > 0) {
			console.log("Found Ed links in message:", edLinks);
			setSearchResults(edLinks);
			return;
		}
		
		// Then check for bracketed thread IDs [XXXXX]
		const threadIdBracketPattern = /\[(\d{5,})\]/g;
		const bracketMatches: string[] = [];
		let bracketMatch;
		
		while ((bracketMatch = threadIdBracketPattern.exec(content)) !== null) {
			if (bracketMatch[1] && !bracketMatches.includes(bracketMatch[1])) {
				bracketMatches.push(bracketMatch[1]);
			}
		}
		
		// If we found bracketed thread IDs, create search results
		if (bracketMatches.length > 0) {
			console.log("Found thread IDs in brackets:", bracketMatches);
			
			const bracketResults = bracketMatches.map((threadId, idx) => ({
				id: `bracket-thread-${idx}`,
				title: `Thread #${threadId}`,
				content: 'Referenced in the response',
				similarity: 0.95 - (idx * 0.05),
				metadata: {
					source: 'thread',
					courseId: selectedCourse?.id ? String(selectedCourse.id) : '0',
					threadId: threadId
				}
			}));
			
			console.log("Created results from bracketed thread IDs:", bracketResults);
			setSearchResults(bracketResults);
		}
	}, [messages, selectedCourse]);

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

			{/* Tiny hidden debug button - clickable but nearly invisible */}
			<div className="mb-1 flex justify-end">
				<button
					type="button"
					onClick={() => {
						console.log("Current messages:", messages);
						console.log("Current search results:", searchResults);
						
						// Force display test results if none are showing
						if (searchResults.length === 0) {
							const testResults: SearchResult[] = [
								{
									id: 'debug-1',
									title: 'Debug Thread 1',
									content: 'Test thread content',
									similarity: 0.95,
									metadata: {
										source: 'thread',
										courseId: selectedCourse?.id ? String(selectedCourse.id) : '1234',
										threadId: '5678'
									}
								},
								{
									id: 'debug-2',
									title: 'Debug Thread 2',
									content: 'More test content',
									similarity: 0.85,
									metadata: {
										source: 'thread',
										courseId: selectedCourse?.id ? String(selectedCourse.id) : '1234',
										threadId: '5679'
									}
								}
							];
							console.log("Setting debug test results");
							setSearchResults(testResults);
						}
					}}
					className="text-[9px] text-gray-100 hover:text-gray-400 h-4 w-4 flex items-center justify-center"
					aria-label="Debug"
				>
					·
				</button>
			</div>

			{/* Sidebar Sources - check if searchResults has items */}
			{searchResults.length > 0 && <SidebarSources results={searchResults} />}

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
