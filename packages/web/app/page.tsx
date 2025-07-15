"use client";

import { PromptInputWithActions } from "@/components/chat/input";
import { NewChatButton } from "@/components/chat/new-chat-button";
import { ThreadsButton } from "@/components/chat/threads-button";
import { AuthWrapper } from "@/components/layout/auth-wrapper";
import { SettingsButton } from "@/components/layout/settings/settings-button";
import { SyncButton } from "@/components/layout/sync-button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TimeDisplay } from "@/components/layout/time-display";
import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/lib/stores/chat-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
	const router = useRouter();
	const { toasts, error: showError, dismiss } = useToast();
	const { clearCurrentChat, createNewChat, selectedModel, setSelectedModel } = useChatStore();
	
	// Landing page input state
	const [input, setInput] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Clear current chat state when landing page loads (only once)
	useEffect(() => {
		clearCurrentChat();
	}, [clearCurrentChat]);

	// Handle landing page input submission
	const handleLandingSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
		if (e) e.preventDefault();
		if (!input.trim() || isSubmitting) return;

		setIsSubmitting(true);
		try {
			// Create new chat and save the first message
			const chatId = await createNewChat(input.trim());
			console.log('✅ [LANDING] Created new chat, navigating to:', chatId);
			// Clear the input
			setInput("");
			// Navigate to the new chat page
			router.push(`/c/${chatId}`);
		} catch (error) {
			console.error('❌ [LANDING] Error creating new chat:', error);
			showError('Failed to create new chat');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthWrapper>
			{/* Fixed elements that don't scroll */}
			<div className="fixed top-4 left-4 flex flex-col gap-2 z-50">
				<div className="text-4xl font-bold text-primary dark:text-primary tracking-tight hover:opacity-80 transition-opacity cursor-default font-title-rounded">
					AskED
				</div>
			</div>

			{/* Theme Toggle Button and Sync Button - Top Right */}
			<div className="fixed top-4 right-4 flex items-center gap-3 z-50">
				<ThreadsButton onThreadSelect={(newChatId) => {
					if (newChatId) {
						router.push(`/c/${newChatId}`);
					}
				}} />
				<NewChatButton onNewChat={() => {
					clearCurrentChat();
					// No need for router.refresh - just clear state
				}} />
				<SyncButton />
				<ThemeToggle />
				<SettingsButton />
			</div>

			<TimeDisplay />

			{/* Main content area - Clean landing page with centered input */}
			<div className="w-full min-h-screen">
				<div className="flex h-screen items-center justify-center">
					<div className="w-full max-w-2xl px-4">
						<form onSubmit={handleLandingSubmit} >
							<div className="w-full max-w-2xl mx-auto transform transition-all duration-300 ease-in-out">
								<PromptInputWithActions
									value={input}
									onValueChange={setInput}
									onSubmit={handleLandingSubmit}
									isLoading={isSubmitting}
									selectedModel={selectedModel}
									setSelectedModel={setSelectedModel}
								/>
							</div>
						</form>
					</div>
				</div>
			</div>

			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</AuthWrapper>
	);
}
