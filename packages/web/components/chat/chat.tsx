"use client";

import { defaultModel, getProviderOptions, type modelID } from "@/ai/providers";
import { PromptInputWithActions } from "@/components/chat/input";
import { Messages } from "@/components/chat/messages";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { toast } from "sonner";

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
			<div className="pb-8 w-full max-w-xl mx-auto px-4 sm:px-0">
				<form onSubmit={handleSubmit} className="w-full pt-4">
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
	);
}
