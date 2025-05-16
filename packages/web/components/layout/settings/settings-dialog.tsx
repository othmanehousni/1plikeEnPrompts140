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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ThemeSwitcher from "./theme-switcher";
import { BookOpen } from "lucide-react";

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
		edStemApiKey,
		setEdStemApiKey,
		clearEdStemApiKey,
		hasEdStemApiKey,
	} = useUserPreferences();
	const [apiKey, setApiKey] = useState("");
	const [edStemKey, setEdStemKey] = useState("");
	const [activeTab, setActiveTab] = useState("api-keys");

	useEffect(() => {
		if (togetherApiKey) {
			setApiKey(togetherApiKey);
		}
		if (edStemApiKey) {
			setEdStemKey(edStemApiKey);
		}
	}, [togetherApiKey, edStemApiKey]);

	const handleSave = () => {
		if (apiKey.trim()) {
			setTogetherApiKey(apiKey.trim());
		} else {
			clearTogetherApiKey();
		}
		
		if (edStemKey.trim()) {
			setEdStemApiKey(edStemKey.trim());
		} else {
			clearEdStemApiKey();
		}
		
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[800px] h-[600px] p-0 overflow-hidden">
				<DialogClose className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" />
				
				<div className="flex h-full">
					<div className="w-56 border-r shrink-0 bg-muted/30">
						<div className="p-6 pb-4">
							<h2 className="text-lg font-semibold tracking-tight">Settings</h2>
							<p className="text-xs text-muted-foreground mt-1">
								Configure your preferences
							</p>
						</div>
						
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className="w-full h-full"
							orientation="vertical"
						>
							<TabsList className="flex flex-col h-auto bg-transparent w-full items-start p-2 pt-0 gap-1.5">
								<TabsTrigger 
									value="api-keys" 
									className="justify-start w-full pl-3 py-2 text-left data-[state=active]:bg-accent/60"
								>
									API Keys
								</TabsTrigger>
								<TabsTrigger 
									value="appearance" 
									className="justify-start w-full pl-3 py-2 text-left data-[state=active]:bg-accent/60"
								>
									Appearance
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
					
					<div className="flex-1 flex flex-col h-full">
						<div className="flex-1 h-[calc(100%-65px)] overflow-hidden">
							<Tabs value={activeTab} className="h-full flex flex-col">
								<TabsContent value="api-keys" className="mt-0 h-full overflow-y-auto p-6 data-[state=inactive]:hidden">
									<div className="space-y-6">
										<div>
											<h3 className="text-base font-medium mb-1.5">API Keys</h3>
											<p className="text-sm text-muted-foreground mb-4">Connect your accounts to use various features</p>
											
											<div className="space-y-6">
												{/* Together AI API Key */}
												<div className="bg-card rounded-md border shadow-sm">
													<div className="flex items-center gap-4 p-4 border-b">
														<div className="flex items-center justify-center size-10 bg-primary/5 rounded-md">
															<TogetherAI className="h-5 w-5 text-primary" />
														</div>
														<div>
															<h4 className="font-medium">Together AI API Key</h4>
															<p className="text-xs text-muted-foreground mt-0.5">
																{hasTogetherApiKey() ? "API key configured" : "No API key configured"}
															</p>
														</div>
													</div>
													
													<div className="p-4 space-y-4">
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
												</div>
												
												{/* EdStem API Key */}
												<div className="bg-card rounded-md border shadow-sm">
													<div className="flex items-center gap-4 p-4 border-b">
														<div className="flex items-center justify-center size-10 bg-emerald-500/10 rounded-md">
															<BookOpen className="h-5 w-5 text-emerald-500" />
														</div>
														<div>
															<h4 className="font-medium">EdStem API Key</h4>
															<p className="text-xs text-muted-foreground mt-0.5">
																{hasEdStemApiKey() ? "API key configured" : "No API key configured"}
															</p>
														</div>
													</div>
													
													<div className="p-4 space-y-4">
														<Input
															id="edStemApiKey"
															type="password"
															placeholder="Enter your EdStem API key"
															value={edStemKey}
															onChange={(e: ChangeEvent<HTMLInputElement>) =>
																setEdStemKey(e.target.value)
															}
															className="border-input bg-background text-foreground"
														/>
														<p className="text-xs text-muted-foreground">
															Your EdStem API key will be stored locally in your browser.
														</p>
													</div>
												</div>
											</div>
										</div>
									</div>
								</TabsContent>
								
								<TabsContent value="appearance" className="mt-0 h-full overflow-y-auto p-6 data-[state=inactive]:hidden">
									<div className="space-y-6">
										<div>
											<h3 className="text-base font-medium mb-1.5">Theme</h3>
											<p className="text-sm text-muted-foreground mb-4">Select your preferred theme</p>
											
											<div className="bg-card rounded-md border shadow-sm p-4">
												<ThemeSwitcher />
											</div>
										</div>
									</div>
								</TabsContent>
							</Tabs>
						</div>
						
						<div className="flex justify-end gap-2 p-4 border-t bg-muted/20 h-[65px] shrink-0">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave}>
								Save Changes
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
