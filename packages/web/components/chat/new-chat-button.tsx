"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function NewChatButton({ onNewChat }: { onNewChat: () => void }) {
	return (
		<div className="relative group">
			<Button
				size="sm"
				variant="outline"
				onClick={onNewChat}
				className="gap-2"
			>
				<Plus className="h-4 w-4" />
				New Chat
			</Button>
			<div className="absolute top-full right-0 mt-2 bg-card/95 dark:bg-card/95 border rounded-md px-3 py-2 shadow-md text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10">
				Start a new conversation
			</div>
		</div>
	);
} 