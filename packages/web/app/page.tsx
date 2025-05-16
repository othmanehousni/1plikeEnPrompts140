import { PromptInputWithActions } from "@/components/chat/input";
import { SettingsButton } from "@/components/layout/settings/settings-button";

export default function Home() {
	return (
		<div className="flex h-screen w-screen items-center justify-center">

			<PromptInputWithActions />
			<SettingsButton />
		</div>
	);
}
