import { NextRequest, NextResponse } from "next/server";
import { validateEpflDomain } from "@/lib/auth-utils";
import { memory } from "@/ai/mastra";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    // Validate EPFL domain before processing request
    const validation = await validateEpflDomain(request);
    if (!validation.isValid) {
      return validation.response!;
    }

    // Ensure user exists (should be guaranteed by validation)
    if (!validation.user?.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 401 });
    }

    const userEmail = validation.user.email;

    const { threadId } = await params;

    // Get the thread first to verify it belongs to the user
    const thread = await memory.getThreadById({ threadId });
    
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Verify the thread belongs to the user
    if (thread.resourceId !== userEmail) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get messages from the thread
    const { messages, uiMessages } = await memory.query({
      threadId,
      selectBy: { last: false }, // Get all messages
    });

    return NextResponse.json({
      thread: {
        id: thread.id,
        title: thread.title || 'New Chat',
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
      },
      messages: messages, // Return core messages as-is
      uiMessages, // Return UI-formatted messages
    });
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 