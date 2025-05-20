import { SYSTEM_PROMPT } from "@/ai/prompts";
import type { modelID } from "@/ai/providers";
import { openai } from "@ai-sdk/openai";
import { streamText, type UIMessage } from "ai";
import { searchEdCourse } from "@/ai/tools";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
	const {
		messages,
		selectedModel,
		selectedCourseId,
	}: {
		messages: UIMessage[];
		selectedModel: modelID;
		selectedCourseId: string;
	} = await req.json();

	const result = streamText({
		model: openai("gpt-4o-mini"),
		system: SYSTEM_PROMPT,
		messages,
		
		//tools: {
		//	searchEdCourse: searchEdCourse(selectedCourseId),
		//},
	});

	return result.toDataStreamResponse({
		sendReasoning: true,
	});
}
