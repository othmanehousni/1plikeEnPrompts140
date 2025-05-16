import { PromptInputWithActions } from "@/components/chat/input";
import { SettingsButton } from "@/components/layout/settings/settings-button";
import { Button } from "@/components/ui/button";
import { PromptInput } from "@/components/ui/prompt-input";
import Image from "next/image";

export default function Home() {
	return (
		<div className="flex h-screen w-screen items-center justify-center">
			<PromptInputWithActions />
			<SettingsButton />
		</div>
	);
}
