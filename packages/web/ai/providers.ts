import { openai } from "@ai-sdk/openai";
import {
	customProvider,
	extractReasoningMiddleware,
	wrapLanguageModel,
} from "ai";

const languageModels = {
	"o4-mini": wrapLanguageModel({
		middleware: extractReasoningMiddleware({
			tagName: "think",
		}),
		model: openai("o4-mini"),
	}),
	"gpt-4.1": wrapLanguageModel({
		middleware: extractReasoningMiddleware({
			tagName: "think",
		}),
		model: openai("gpt-4.1"),
	}),
};

export const model = customProvider({
	languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "o4-mini";
