"use client";

import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import {
	ArrowUp,
	Loader2,
	Paperclip,
	Square,
	X,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

// Define props for PromptInputWithActions
interface PromptInputWithActionsProps {
	value: string;
	onValueChange: (value: string) => void;
	onSubmit: (e?: FormEvent<HTMLFormElement>) => void;
	isLoading: boolean;
}

export function PromptInputWithActions({
	value,
	onValueChange,
	onSubmit,
	isLoading,
}: PromptInputWithActionsProps) {
	// File handling state remains internal for now
	const [files, setFiles] = useState<File[]>([]);
	const uploadInputRef = useRef<HTMLInputElement>(null);

	// Internal submit handler calls the passed onSubmit prop
	const handleFormSubmit = (e?: FormEvent<HTMLFormElement>) => {
		if (e) e.preventDefault(); // Prevent default form submission
		// The PromptInput component itself might call onSubmit without an event
		// if its internal textarea handles Enter key.
		// The button click will pass an event.
		if (value.trim() || files.length > 0) {
			onSubmit(); // Call the onSubmit passed from useChat
			// Clearing input and files should be handled by the parent (useChat) if it controls 'value'
			// setFiles([]); // Keep file clearing local for now, or lift state
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			// Convert FileList to array and append to existing files
			const newFiles = Array.from(e.target.files);
			setFiles((prev) => [...prev, ...newFiles]);

			// Reset the input value so the same file can be selected again
			if (uploadInputRef.current) {
				uploadInputRef.current.value = "";
			}
		}
	};

	const handleRemoveFile = (index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	};

	return (
		<PromptInput
			value={value} // Controlled by prop
			onValueChange={onValueChange} // Controlled by prop
			isLoading={isLoading} // Submit button loading state
			onSubmit={handleFormSubmit} // Internal handler that calls prop
			className="w-full max-w-(--breakpoint-md)"
		>
			{files.length > 0 && (
				<div className="flex flex-wrap gap-2 pb-2">
					{files.map((file, index) => (
						<div
							key={`${file.name}-${index}`}
							className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
						>
							<Paperclip className="size-4" />
							<span className="max-w-[120px] truncate">{file.name}</span>
							<button
								type="button"
								onClick={() => handleRemoveFile(index)}
								className="hover:bg-secondary/50 rounded-full p-1"
							>
								<X className="size-4" />
							</button>
						</div>
					))}
				</div>
			)}

			<PromptInputTextarea
				placeholder="Ask me anything..."
				disabled={isLoading}
			/>

			<PromptInputActions className="flex items-center justify-between gap-2 pt-2">
				<div className="flex items-center gap-1">
					{/* Group left actions */}
					<PromptInputAction tooltip="Attach files">
						<label
							htmlFor="file-upload"
							className={`hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl ${
								isLoading ? "opacity-50 cursor-not-allowed" : ""
							}`}
						>
							<input
								type="file"
								multiple
								onChange={handleFileChange}
								className="hidden"
								id="file-upload"
								ref={uploadInputRef}
								disabled={isLoading}
							/>
							<Paperclip className="text-primary size-5" />
						</label>
					</PromptInputAction>
				</div>

				<PromptInputAction
					tooltip={isLoading ? "Stop generation" : "Send message"}
				>
					<Button
						type="submit" // This is sufficient to trigger the form's onSubmit
						variant="default"
						size="icon"
						className="h-8 w-8 rounded-full"
						disabled={
							isLoading || (!value.trim() && files.length === 0)
						}
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
