import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let message = '';
  
  try {
    const body = await request.json();
    message = body.message;
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const { text } = await generateText({
      model: openai("gpt-4.1-nano"),
      prompt: `Generate a concise title for this conversation based on the first user message: "${message}"`,
      maxTokens: 50,
    });

    return NextResponse.json({ title: text.trim() });
  } catch (error) {
    console.error('Error generating chat title:', error);
    
    // Fallback to a simple title
    const fallbackTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
    return NextResponse.json({ title: fallbackTitle });
  }
} 