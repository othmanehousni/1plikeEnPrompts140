import { NextResponse } from 'next/server';

export const maxDuration = 60; // Transcription can take longer

// Default to whisper-large-v3-turbo for faster processing
const GROQ_TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';

// Valid file formats for Groq transcription
const GROQ_SUPPORTED_FORMATS = ['flac', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'wav', 'webm'];

// Helper function to get file extension from MIME type
function getExtensionFromMimeType(mimeType: string): string {
	// Extract just the subtype from MIME type (e.g., 'audio/webm' -> 'webm')
	const match = mimeType.match(/^(?:audio|video)\/(?:x-)?(.+?)(?:;.*)?$/);
	if (match?.[1]) {
		// Handle special cases
		if (match[1] === 'mpeg') return 'mp3';
		if (match[1].includes('opus')) return 'opus';
		return match[1];
	}
	// Default to wav if no match
	return 'wav';
}

export async function POST(req: Request) {
	try {
		const groqApiKey = req.headers.get('x-groq-api-key');

		if (!groqApiKey) {
			return new Response(JSON.stringify({ error: "Missing Groq API key for transcription." }), 
				{ status: 401, headers: { 'Content-Type': 'application/json' } });
		}

		// Get audio data from request
		const audioBlob = await req.blob();
		if (!audioBlob || audioBlob.size === 0) {
			return new Response(JSON.stringify({ error: "No audio data received." }), 
				{ status: 400, headers: { 'Content-Type': 'application/json' } });
		}
		
		// Get the file extension from the MIME type
		const fileExt = getExtensionFromMimeType(audioBlob.type);
		console.log(`[TRANSCRIBE] Detected audio format: ${audioBlob.type}, using extension: ${fileExt}`);
		
		// Validate the file format against Groq's supported formats
		if (!GROQ_SUPPORTED_FORMATS.includes(fileExt)) {
			return new Response(JSON.stringify({ 
				error: `Unsupported audio format for Groq: ${audioBlob.type}. Supported formats are: ${GROQ_SUPPORTED_FORMATS.join(', ')}`,
				details: "Your browser may not support recording in a compatible format. Try a different browser or microphone setup." 
			}), { status: 400, headers: { 'Content-Type': 'application/json' } });
		}
		
		// Create a properly named file for Groq
		const fileName = `audio.${fileExt}`;
		const file = new File([audioBlob], fileName, { type: audioBlob.type });
		
		console.log(`[TRANSCRIBE] Transcribing with Groq model: ${GROQ_TRANSCRIPTION_MODEL}`);

		// Create FormData for multipart/form-data request
		const formData = new FormData();
		formData.append('file', file);
		formData.append('model', GROQ_TRANSCRIPTION_MODEL);
		formData.append('response_format', 'json');
		formData.append('temperature', '0.0');
		
		// Make direct API call to Groq's transcription endpoint
		const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${groqApiKey}`
			},
			body: formData
		});
		
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[TRANSCRIBE_ERROR] Groq API error:', errorData);
			
			return new Response(JSON.stringify({
				error: errorData.error?.message || `Groq API error: ${response.status} ${response.statusText}`,
				provider: 'Groq',
				model: GROQ_TRANSCRIPTION_MODEL
			}), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		// Parse the JSON response
		const result = await response.json();
		
		return new Response(JSON.stringify({ 
			transcription: result.text,
			details: result
		}), { 
			status: 200, 
			headers: { 'Content-Type': 'application/json' } 
		});

	} catch (error: unknown) {
		console.error("[TRANSCRIBE_ERROR]", error);
		let errorMessage = "An error occurred while transcribing audio.";
		let statusCode = 500;

		if (error instanceof Error) {
			console.error(`[TRANSCRIBE_ERROR] Groq/${GROQ_TRANSCRIPTION_MODEL}:`, error.message);
			
			if (error.message.toLowerCase().includes("no transcript generated")) {
				errorMessage = `Failed to transcribe audio with Groq model '${GROQ_TRANSCRIPTION_MODEL}'.`;
				statusCode = 400;
			} else if (error.message.includes("api key")) {
				errorMessage = "Invalid or missing Groq API key.";
				statusCode = 401;
			} else if (error.message.includes("file must be one of the following types")) {
				errorMessage = `Audio format not supported by Groq. Supported formats are: ${GROQ_SUPPORTED_FORMATS.join(', ')}`;
				statusCode = 400;
			} else {
				errorMessage = error.message;
			}
		} else if (typeof error === 'string'){
			errorMessage = error;
		} else if (typeof error === 'object' && error !== null) {
			errorMessage = JSON.stringify(error);
		}
		
		return new Response(JSON.stringify({ 
			error: errorMessage, 
			provider: 'Groq', 
			model: GROQ_TRANSCRIPTION_MODEL 
		}), { 
			status: statusCode, 
			headers: { 'Content-Type': 'application/json' } 
		});
	}
} 