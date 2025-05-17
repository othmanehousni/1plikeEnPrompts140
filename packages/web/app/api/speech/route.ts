import { NextResponse } from "next/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Groq TTS model and default voice
const GROQ_TTS_MODEL = "playai-tts";
const DEFAULT_VOICE = "Fritz-PlayAI";

export async function POST(req: Request) {
	try {
		const requestBody = await req.json();

		if (
			!requestBody ||
			typeof requestBody !== "object" ||
			typeof requestBody.text !== "string"
		) {
			return new Response(
				JSON.stringify({
					error: "Invalid request: 'text' must be a non-empty string.",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const { text, voice = DEFAULT_VOICE } = requestBody;
		const groqApiKey = req.headers.get("x-groq-api-key");

		if (!groqApiKey) {
			return new Response(
				JSON.stringify({
					error: "Missing Groq API key. Please add your API key in settings.",
				}),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}

		console.log(`[SPEECH] Generating speech with Groq model: ${GROQ_TTS_MODEL}`);

		// Make direct API call to Groq's TTS endpoint
		const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${groqApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: GROQ_TTS_MODEL,
				input: text,
				voice: voice,
				response_format: "wav"
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error("[SPEECH_ERROR] Groq API error:", errorData);
			
			return new Response(
				JSON.stringify({
					error: errorData.error?.message || `Groq API error: ${response.status} ${response.statusText}`,
					provider: "Groq",
					model: GROQ_TTS_MODEL,
				}),
				{ status: response.status, headers: { "Content-Type": "application/json" } },
			);
		}

		// Get the audio data directly from the response
		const audioData = await response.arrayBuffer();
		const contentType = "audio/wav";

		return new Response(audioData, {
			status: 200,
			headers: { "Content-Type": contentType },
		});
	} catch (error: unknown) {
		console.error("[SPEECH_ERROR]", error);
		let errorMessage = "An error occurred while generating speech.";
		let statusCode = 500;

		if (error instanceof Error) {
			console.error(
				`[SPEECH_ERROR] Groq/${GROQ_TTS_MODEL}:`,
				error.message,
			);

			if (error.message.toLowerCase().includes("failed to generate audio")) {
				errorMessage = `Failed to generate audio with Groq TTS model '${GROQ_TTS_MODEL}'.`;
			} else if (error.message.includes("api key")) {
				errorMessage = "Invalid or missing Groq API key.";
				statusCode = 401;
			} else {
				errorMessage = error.message;
			}
		}

		return new Response(
			JSON.stringify({
				error: errorMessage,
				provider: "Groq",
				model: GROQ_TTS_MODEL,
			}),
			{ status: statusCode, headers: { "Content-Type": "application/json" } },
		);
	}
}
