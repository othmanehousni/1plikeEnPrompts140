import { NextRequest, NextResponse } from "next/server";
import { validateEpflDomain } from "@/lib/auth-utils";
import { memory } from "@/ai/mastra";

interface ThreadWithMessages {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export async function GET(request: NextRequest) {
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

    // Get all threads for this user from memory using the correct API
    try {
      // Get threads by resource ID (user email)
      const threads = await memory.getThreadsByResourceId({
        resourceId: userEmail,
      });

      // Transform threads to include basic metadata
      // Note: We avoid querying message count here for performance
      const threadsWithMetadata: ThreadWithMessages[] = threads.map((thread) => ({
        id: thread.id,
        title: thread.title || thread.id || 'New Chat',
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        messageCount: 0, // Will be populated by the UI when needed
      }));

      // Sort by updatedAt (most recent first)
      threadsWithMetadata.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return NextResponse.json({ threads: threadsWithMetadata });
    } catch (memoryError) {
      console.error('Error accessing memory:', memoryError);
      // Return empty threads array if memory access fails
      return NextResponse.json({ threads: [] });
    }
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 