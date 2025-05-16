"use client";

import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { Input } from "@/components/ui/input";
import { SettingsButton } from "@/components/layout/settings/settings-button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { useUserPreferences } from "@/lib/stores/user-preferences";

export default function Home() {
	const [toolCall, setToolCall] = useState<string>();
	const { toasts, error: showError, dismiss } = useToast();
	const { togetherApiKey } = useUserPreferences();

	const { messages, input, handleInputChange, handleSubmit, isLoading } =
		useChat({
			headers: {
				"x-together-api-key": togetherApiKey || "",
			},
			onToolCall({ toolCall }) {
				setToolCall(toolCall.toolName);
			},
			onError: (err) => {
				console.error("Chat error:", err);

				// Parse error message if it's from our API
				try {
					// If it's a JSON response from our API
					if (typeof err === "object" && err.message) {
						const errorData = JSON.parse(err.message);
						if (errorData.error) {
							showError(errorData.error);
							return;
						}
					}
				} catch (e) {
					// Not a JSON error, continue to default message
				}

				// Default error message
				if (err.message?.includes('rate limit')) {
					showError("You've been rate limited, please try again later!");
				} else if (err.message?.includes('api key')) {
					showError("Missing API key. Please add your TogetherAI API key in settings.");
				} else if (err.message?.toLowerCase().includes('failed to fetch')) {
					showError("Network error: Failed to connect. Please check your connection and try again.");
				} else if (err.message) {
					showError(err.message);
				} else {
					showError("An unknown error occurred. Please try again later!");
				}
			},
		});

	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	// Show a warning if no API key is set
	useEffect(() => {
		if (!togetherApiKey) {
			showError(
				"Please add your TogetherAI API key in settings to use the chat.",
			);
		}
	}, [togetherApiKey, showError]);

	useEffect(() => {
		if (messages.length > 0) setIsExpanded(true);
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
		.filter((m) => m.role !== "user")
		.slice(-1)[0];

	return (
		<div className="flex h-screen w-screen items-center justify-center">
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
						<form onSubmit={handleSubmit} className="flex space-x-2">
							<Input
								className="bg-neutral-100 text-base w-full text-neutral-700 dark:bg-neutral-700 dark:placeholder:text-neutral-400 dark:text-neutral-300"
								minLength={3}
								required
								value={input}
								placeholder="Ask me anything..."
								onChange={handleInputChange}
								disabled={!togetherApiKey}
							/>
						</form>
						<motion.div
							transition={{
								type: "spring",
							}}
							className="min-h-fit flex flex-col gap-2"
						>
							<AnimatePresence>
								{awaitingResponse || currentToolCall ? (
									<div className="px-2 min-h-12">
										{userQuery && (
											<div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
												{userQuery.content}
											</div>
										)}
										<Loading tool={currentToolCall} />
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
		// Add other tool names and their display versions here
	};
	const defaultToolName = "Thinking";

	const displayName = tool && toolDisplayNames[tool] ? toolDisplayNames[tool] : defaultToolName;

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
						{displayName}...
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
