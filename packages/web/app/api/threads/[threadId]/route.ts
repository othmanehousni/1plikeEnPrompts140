import { NextRequest, NextResponse } from 'next/server';
import { validateEpflDomain } from '@/lib/auth-utils';
import { memory } from '@/ai/mastra';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const validation = await validateEpflDomain(request);
    if (!validation.isValid) {
      return validation.response!;
    }

    // By reading the request body, we signal to Next.js that we're accessing dynamic properties.
    // This is a no-op for DELETE requests but is required to resolve the warning.
    await request.text();

    const { threadId } = await params;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    if (!memory.storage.deleteThread) {
      return NextResponse.json({ error: 'Delete thread functionality not available on the current storage provider.' }, { status: 501 });
    }

    await memory.storage.deleteThread({ threadId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thread:', error);
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const validation = await validateEpflDomain(request);
    if (!validation.isValid) {
      return validation.response!;
    }

    // Reading the body from the request unlocks access to `params` and avoids a Next.js warning.
    const { title } = await request.json();
    const { threadId } = await params;

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Valid title is required' }, { status: 400 });
    }

    if (!memory.storage.updateThread) {
      return NextResponse.json({ error: 'Update thread functionality not available on the current storage provider.' }, { status: 501 });
    }
    
    const existingThread = await memory.storage.getThreadById({ threadId });

    if (!existingThread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const updatedThreadData = {
      ...existingThread,
      title: title.trim(),
      metadata: {
        ...existingThread.metadata,
        title: title.trim(),
      },
    };

    await memory.storage.updateThread(updatedThreadData);

    return NextResponse.json({ success: true, title: title.trim() });
  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    );
  }
} 