"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSyncStatus } from "@/lib/stores/sync-status";
import { useUserPreferences } from "@/lib/stores/user-preferences";
import { BookOpen } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { EdStemSyncButton } from "./edstem-sync-button";
import ThemeSwitcher from "./theme-switcher";

export interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
	const { edStemApiKey, setEdStemApiKey, clearEdStemApiKey, hasEdStemApiKey } =
		useUserPreferences();

	const { lastSyncedAt } = useSyncStatus();

	const [edStemKey, setEdStemKey] = useState(edStemApiKey || "");
	const [activeTab, setActiveTab] = useState("api-keys");

	// This effect resets the local input states if the persisted values change
	// or when the dialog is (re)opened
	useEffect(() => {
		if (open) {
			setEdStemKey(edStemApiKey || "");
		}
	}, [edStemApiKey, open]);

	const handleSave = () => {
		if (edStemKey.trim()) setEdStemApiKey(edStemKey.trim());
		else clearEdStemApiKey();

		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[800px] h-[600px] p-0 overflow-hidden">
				<DialogClose className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50" />

				<div className="flex h-full">
					{/* Left sidebar with tabs */}
					<div className="w-56 border-r bg-muted/30 shrink-0 p-6">
						<div className="mb-6">
							<h2 className="text-lg font-semibold tracking-tight">Settings</h2>
							<p className="text-xs text-muted-foreground mt-1">
								Configure your preferences
							</p>
						</div>

						<div className="flex flex-col space-y-1">
							<button
								type="button"
								className={`text-left px-3 py-2 rounded-md ${
									activeTab === "api-keys"
										? "bg-accent/60 text-accent-foreground"
										: "hover:bg-muted"
								}`}
								onClick={() => setActiveTab("api-keys")}
							>
								API Keys
							</button>
							<button
								type="button"
								className={`text-left px-3 py-2 rounded-md ${
									activeTab === "appearance"
										? "bg-accent/60 text-accent-foreground"
										: "hover:bg-muted"
								}`}
								onClick={() => setActiveTab("appearance")}
							>
								Appearance
							</button>
						</div>
					</div>

					{/* Right content area */}
					<div className="flex-1 flex flex-col">
						<div className="flex-1 h-[calc(100%-65px)] overflow-y-auto p-6">
							{/* API Keys Tab Content */}
							{activeTab === "api-keys" && (
								<div className="space-y-6">
									<div>
										<h3 className="text-base font-medium mb-1.5">API Keys</h3>
										<p className="text-sm text-muted-foreground mb-4">
											Connect your account to use the app
										</p>

										<div className="space-y-6">
											{/* EdStem API Key */}
											<div className="bg-card rounded-md border shadow-sm">
												<div className="flex items-center gap-4 p-4 border-b">
													<div className="flex items-center justify-center size-10 bg-emerald-500/10 rounded-md">
														<BookOpen className="h-5 w-5 text-emerald-500" />
													</div>
													<div>
														<h4 className="font-medium">EdStem API Key</h4>
														<p className="text-xs text-muted-foreground mt-0.5">
															{hasEdStemApiKey()
																? "API key configured"
																: "No API key configured"}
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
														Your EdStem API key will be stored locally in your
														browser.
													</p>

													<div className="flex items-center justify-between">
														<EdStemSyncButton />
														{lastSyncedAt && (
															<p className="text-xs text-muted-foreground">
																Last synced:{" "}
																{new Date(lastSyncedAt).toLocaleString()}
															</p>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* Appearance Tab Content */}
							{activeTab === "appearance" && (
								<div className="space-y-6">
									<div>
										<h3 className="text-base font-medium mb-1.5">Theme</h3>
										<p className="text-sm text-muted-foreground mb-4">
											Select your preferred theme
										</p>

										<div className="bg-card rounded-md border shadow-sm p-4">
											<ThemeSwitcher />
										</div>
									</div>
								</div>
							)}
						</div>

						{/* Footer with action buttons */}
						<div className="flex justify-end gap-2 p-4 border-t bg-muted/20 h-[65px] shrink-0">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button onClick={handleSave}>Save Changes</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
