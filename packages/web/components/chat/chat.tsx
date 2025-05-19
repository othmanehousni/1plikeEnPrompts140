"use client";

import { defaultModel, getProviderOptions, type modelID } from "@/ai/providers";
import { Messages } from "@/components/chat/messages";
import { Textarea } from "@/components/chat/textarea";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { toast } from "sonner";
import { useUserPreferences } from "@/lib/stores/user-preferences";

export default function Chat() {
	const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);

	const { messages, input, handleInputChange, handleSubmit, status, stop } =
		useChat({
			maxSteps: 5,
			body: {
				selectedModel,
			},
			// @ts-expect-error - providerOptions is supported but types may be outdated
			providerOptions: getProviderOptions(selectedModel),
			onError: (error) => {
				toast.error(
					error.message.length > 0
						? error.message
						: "An error occured, please try again later.",
					{ position: "top-center", richColors: true },
				);
			},
		});

	const isLoading = status === "streaming" || status === "submitted";

	return (
		<div className="h-dvh flex flex-col justify-between w-full stretch">
			<Messages messages={messages} isLoading={isLoading} status={status} />
			<form
				onSubmit={handleSubmit}
				className="pb-8 w-full max-w-xl mx-auto px-4 sm:px-0"
			>
				<Textarea
					selectedModel={selectedModel}
					setSelectedModel={setSelectedModel}
					handleInputChange={handleInputChange}
					input={input}
					isLoading={isLoading}
					status={status}
					stop={stop}
				/>
			</form>
		</div>
	);
}
