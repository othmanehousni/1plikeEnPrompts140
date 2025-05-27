import { useChat as useVercelChat } from 'ai/react';
import { useState, useEffect } from 'react';
import { addMessage, getAllThreads, getThread, createThread } from '@/lib/db';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Thread, Message } from '@/lib/db/schema';

export function useChat() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [storedMessages, setStoredMessages] = useState<Message[]>([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get('thread');
  
  // Initialize chat state
  useEffect(() => {
    async function initialize() {
      try {
        // Load threads
        const allThreads = await getAllThreads();
        setThreads(allThreads);
        
        // If threadId provided, load that thread
        if (threadId) {
          const thread = await getThread(Number(threadId));
          if (thread) {
            setCurrentThread(thread);
            setStoredMessages(thread.messages || []);
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setIsInitialized(true);
      }
    }
    
    initialize();
  }, [threadId]);
  
  // Use Vercel's useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: vercelHandleSubmit,
    isLoading,
    error,
    append,
    reload,
    stop,
    setMessages,
  } = useVercelChat({
    api: '/api/chat',
    id: currentThread?.id.toString(),
    initialMessages: storedMessages.map(msg => ({
      id: msg.id.toString(),
      content: msg.content,
      role: msg.role as 'user' | 'assistant',
    })),
    onResponse: async (response) => {
      // Extract thread ID from response headers
      const threadId = response.headers.get('x-thread-id');
      if (threadId && !currentThread) {
        const thread = await getThread(Number(threadId));
        if (thread) {
          setCurrentThread(thread);
          router.push(`/?thread=${threadId}`);
        }
      }
    },
    maxSteps: 5, // Allow up to 5 steps for multi-step tool calls
  });

  // Handle account revocation - after chat hook is initialized
  useEffect(() => {
    const handleRevocation = () => {
      console.log('Chat: Handling account revocation - clearing chat state');
      
      // Clear all chat state
      setThreads([]);
      setCurrentThread(null);
      setStoredMessages([]);
      setIsInitialized(false);
      
      // Stop any ongoing chat operations if available
      try {
        stop();
        setMessages([]);
      } catch (error) {
        console.log('Chat: Stop/setMessages not available during revocation');
      }
      
      console.log('Chat: Successfully disconnected from chat');
    };

    const handleDisconnect = () => {
      console.log('Chat: Handling user disconnect - clearing chat state');
      
      // Clear all chat state
      setThreads([]);
      setCurrentThread(null);
      setStoredMessages([]);
      setIsInitialized(false);
      
      // Stop any ongoing chat operations if available
      try {
        stop();
        setMessages([]);
      } catch (error) {
        console.log('Chat: Stop/setMessages not available during disconnect');
      }
      
      console.log('Chat: Successfully cleared chat state for disconnect');
    };

    // Listen for revocation and disconnect events
    window.addEventListener('account-revoked', handleRevocation);
    window.addEventListener('user-disconnected', handleDisconnect);
    
    return () => {
      window.removeEventListener('account-revoked', handleRevocation);
      window.removeEventListener('user-disconnected', handleDisconnect);
    };
  }, [stop, setMessages]);
  
  // Custom submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // If no current thread, create one
    if (!currentThread) {
      const newThread = await createThread(`${input.slice(0, 50)}...`);
      setCurrentThread(newThread);
      router.push(`/?thread=${newThread.id}`);
    }
    
    // Call the Vercel submit handler
    vercelHandleSubmit(e);
  };
  
  // Function to switch threads
  const switchThread = async (threadId: number) => {
    const thread = await getThread(threadId);
    if (thread) {
      setCurrentThread(thread);
      setStoredMessages(thread.messages || []);
      
      // Update messages in the chat UI
      setMessages(
        thread.messages.map(msg => ({
          id: msg.id.toString(),
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
        }))
      );
      
      router.push(`/?thread=${threadId}`);
    }
  };
  
  // Function to create a new thread
  const newThread = () => {
    setCurrentThread(null);
    setStoredMessages([]);
    setMessages([]);
    router.push('/');
  };
  
  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    reload,
    stop,
    threads,
    currentThread,
    switchThread,
    newThread,
    isInitialized,
  };
} 