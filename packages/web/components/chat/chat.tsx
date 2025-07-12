"use client";

import { defaultModel, getProviderOptions, type modelID } from "@/ai/providers";
import { PromptInputWithActions } from "@/components/chat/input";
import { Messages } from "@/components/chat/messages";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ChatProps {
	threadId?: string;
	onThreadChange?: (threadId: string) => void;
}

export default function Chat({ threadId: propThreadId, onThreadChange }: ChatProps = {}) {
	const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
	const [threadId, setThreadId] = useState<string>(() => {
		// Use prop thread ID if provided, otherwise generate a new one
		return propThreadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	});

	// Update thread ID when prop changes
	useEffect(() => {
		if (propThreadId && propThreadId !== threadId) {
			setThreadId(propThreadId);
		}
	}, [propThreadId, threadId]);

	const { messages, input, handleInputChange, handleSubmit, status, stop } =
		useChat({
			api: '/api/chat', // Explicitly set the API endpoint
			streamProtocol: 'text', // Use text streaming for Mastra compatibility
			maxSteps: 5,
			body: {
				selectedModel,
				threadId, // Include thread ID for memory persistence
			},
			// @ts-expect-error - providerOptions is supported but types may be outdated
			providerOptions: getProviderOptions(selectedModel),
			onError: (error) => {
				toast.error(
					error.message.length > 0
						? error.message
						: "An error occurred, please try again later.",
					{ position: "top-center", richColors: true },
				);
			},
		});

	const isLoading = status === "streaming" || status === "submitted";

	// Function to start a new conversation thread (for future use)
	const startNewThread = () => {
		const newThreadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		setThreadId(newThreadId);
		// Refresh the page to start fresh - useChat will initialize with new threadId
		window.location.reload();
	};

	return (
		<div className="w-full min-h-screen">
			<Messages 
				messages={messages} 
				isLoading={isLoading} 
				status={status} 
			/>
			
			{/* Fixed input at bottom */}
			<div className="fixed bottom-0 left-0 right-0 bg-transparent p-4">
				<div className="w-full max-w-xl mx-auto px-4">
					<form onSubmit={handleSubmit} className="w-full">
						<PromptInputWithActions
							value={input}
							onValueChange={(value) =>
								handleInputChange({
									target: { value },
								} as React.ChangeEvent<HTMLInputElement>)
							}
							onSubmit={handleSubmit}
							isLoading={isLoading}
							onStop={stop}
							selectedModel={selectedModel}
							setSelectedModel={setSelectedModel}
						/>
					</form>
				</div>
			</div>
		</div>
	);
}
