import { openai } from "@ai-sdk/openai";
import { customProvider } from "ai";

const languageModels = {
	"o4-mini": openai.responses("o4-mini"),
	"gpt-4.1": openai.responses("gpt-4.1"),
};

export const model = customProvider({
	languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "o4-mini";

// Provider option helper for enabling reasoning summaries
export const getProviderOptions = (modelId: modelID) => {
	if (modelId === "o4-mini") {
		return {
			openai: {
				reasoningSummary: "detailed",
			},
		};
	}
	return {};
};
