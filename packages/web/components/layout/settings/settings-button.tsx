"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { SettingsDialog } from "@/components/layout/settings/settings-dialog";

export function SettingsButton() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="rounded-full hover:bg-muted transition-colors"
				onClick={() => setIsOpen(true)}
			>
				<Settings className="h-4 w-4" />
			</Button>

			<SettingsDialog open={isOpen} onOpenChange={setIsOpen} />
		</>
	);
}
