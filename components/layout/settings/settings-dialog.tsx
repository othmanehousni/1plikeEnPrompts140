"use client";

import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserPreferences } from "@/lib/stores/user-preferences";
import TogetherAI from "@/components/icons/together-ai";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/animate-ui/radix/tabs";
import ThemeSwitcher from "./theme-switcher/theme-switcher";

export interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
	const {
		togetherApiKey,
		setTogetherApiKey,
		clearTogetherApiKey,
		hasTogetherApiKey,
	} = useUserPreferences();
	const [apiKey, setApiKey] = useState("");
	const [activeTab, setActiveTab] = useState("api-keys");

	useEffect(() => {
		if (togetherApiKey) {
			setApiKey(togetherApiKey);
		}
	}, [togetherApiKey]);

	const handleSave = () => {
		if (apiKey.trim()) {
			setTogetherApiKey(apiKey.trim());
		} else {
			clearTogetherApiKey();
		}
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] bg-card text-card-foreground border-border">
				<DialogClose />
				<DialogHeader className="space-y-2">
					<DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						Configure your preferences and API keys
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-6">
					<Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1">
						<TabsList className="flex flex-col w-40 h-auto p-1">
							<TabsTrigger value="api-keys" className="justify-start w-full mb-1">API Keys</TabsTrigger>
							<TabsTrigger value="appearance" className="justify-start w-full">Appearance</TabsTrigger>
						</TabsList>
						
						<div className="flex-1">
							<TabsContent value="api-keys" className="space-y-4 mt-0">
								<div className="grid gap-3">
									<div className="flex items-center gap-3">
										<div className="flex items-center justify-center dark:bg-white bg-black dark:bg-opacity-90 p-1.5 rounded-md">
											<TogetherAI className="h-10 w-10" />
										</div>
										<h3 className="font-medium">Together AI API Key</h3>
									</div>
									<Input
										id="togetherApiKey"
										type="password"
										placeholder="Enter your Together AI API key"
										value={apiKey}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											setApiKey(e.target.value)
										}
										className="border-input bg-background text-foreground"
									/>
									<p className="text-xs text-muted-foreground">
										Your API key will be stored locally in your browser.
									</p>
								</div>
							</TabsContent>
							
							<TabsContent value="appearance" className="space-y-4 mt-0">
								<div className="grid gap-4">
									<h3 className="font-medium">Theme</h3>
									<ThemeSwitcher />
								</div>
							</TabsContent>
						</div>
					</Tabs>
				</div>

				<div className="flex justify-end pt-4">
					<Button
						onClick={handleSave}
						className="bg-primary text-primary-foreground hover:bg-primary/90"
					>
						Save Settings
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
