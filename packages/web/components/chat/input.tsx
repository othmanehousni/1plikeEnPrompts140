"use client";

import { Button } from "@/components/ui/button";
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { ArrowUp, Square } from "lucide-react";
import type { FormEvent } from "react";
import type { modelID } from "@/ai/providers";
import { MODELS } from "@/ai/providers";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Define props for PromptInputWithActions
interface PromptInputWithActionsProps {
	value: string;
	onValueChange: (value: string) => void;
	onSubmit: (e?: FormEvent<HTMLFormElement>) => void;
	isLoading: boolean;
	onStop?: () => void;
	selectedModel: modelID;
	setSelectedModel: (model: modelID) => void;
}

export function PromptInputWithActions({
	value,
	onValueChange,
	onSubmit,
	isLoading,
	onStop,
	selectedModel,
	setSelectedModel,
}: PromptInputWithActionsProps) {
	// Internal submit handler calls the passed onSubmit prop
	const handleFormSubmit = (e?: FormEvent<HTMLFormElement>) => {
		if (e) e.preventDefault(); // Prevent default form submission

		if (value.trim()) {
			onSubmit(); // Call the onSubmit passed from useChat
		}
	};

	const handleStopGeneration = () => {
		if (onStop) {
			onStop();
		}
	};

	return (
		<PromptInput
			value={value} // Controlled by prop
			onValueChange={onValueChange} // Controlled by prop
			isLoading={isLoading} // Submit button loading state
			onSubmit={handleFormSubmit} // Internal handler that calls prop
			className="w-full max-w-(--breakpoint-md)"
		>
			<PromptInputTextarea
				placeholder="Ask me anything..."
				disabled={isLoading}
			/>

			<PromptInputActions className="flex items-center justify-between gap-2 pt-2">
				<div className="flex items-center gap-1">
					<PromptInputAction tooltip="Select AI model">
						<Select

							value={selectedModel}
							onValueChange={(value) => setSelectedModel(value as modelID)}
							disabled={isLoading}
						>
							<SelectTrigger className="h-8 w-auto text-sm" size="sm">
								<SelectValue placeholder="Select model" />
							</SelectTrigger>
							<SelectContent>
								{MODELS.map((modelId) => (
									<SelectItem key={modelId} value={modelId}>
										{modelId}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</PromptInputAction>
				</div>

				<PromptInputAction
					tooltip={isLoading ? "Stop generation" : "Send message"}
				>
					<Button
						type={isLoading ? "button" : "submit"}
						variant="default"
						size="icon"
						className="h-8 w-8 rounded-full"
						disabled={!isLoading && !value.trim()}
						onClick={isLoading ? handleStopGeneration : undefined}
					>
						{isLoading ? (
							<Square className="size-5 fill-current" />
						) : (
							<ArrowUp className="size-5" />
						)}
					</Button>
				</PromptInputAction>
			</PromptInputActions>
		</PromptInput>
	);
}