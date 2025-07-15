"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { Messages } from "@/components/chat/messages";
import { PromptInputWithActions } from "@/components/chat/input";
import { useChat } from "@ai-sdk/react";
import { toast } from "sonner";
import { createMessage } from "@/lib/db/local";
import { SettingsButton } from "@/components/layout/settings/settings-button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThreadsButton } from "@/components/chat/threads-button";
import { SyncButton } from "@/components/layout/sync-button";
import { NewChatButton } from "@/components/chat/new-chat-button";
import { TimeDisplay } from "@/components/layout/time-display";
import { useRouter } from "next/navigation";
import { AuthWrapper } from "@/components/layout/auth-wrapper";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const submissionChatIdRef = useRef<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const { 
    isInitialized: storeInitialized,
    setChatId,
    loadChat,
    clearCurrentChat,
    selectedModel,
    setSelectedModel
  } = useChatStore();

  // Load initial messages once when component mounts
  useEffect(() => {
    if (!storeInitialized || !chatId || isInitialized) return;

    const initializeChat = async () => {
      console.log('[CHAT PAGE] Loading initial messages for:', chatId);
      setChatId(chatId);
      const messages = await loadChat(chatId);
      
      // Set initial messages for useChat (one-time only)
      setInitialMessages(messages);
      setIsInitialized(true);
      
      console.log('[CHAT PAGE] Loaded', messages.length, 'initial messages');
    };

    initializeChat();
  }, [chatId, storeInitialized, isInitialized, setChatId, loadChat]);

  // Reset when chatId changes
  useEffect(() => {
    setIsInitialized(false);
    setInitialMessages([]);
  }, [chatId]);

  // Initialize useChat with loaded messages - no sync after this point
  const { messages, input, handleInputChange, handleSubmit, status, stop, reload } =
    useChat({
      api: '/api/chat',
      body: {
        selectedModel,
      },
      initialMessages: initialMessages, // Only set once
      onError: (error) => {
        console.error('❌ [CHAT PAGE] useChat error:', error);
        toast.error(
          error.message.length > 0
            ? error.message
            : "An error occurred, please try again later.",
          { position: "top-center", richColors: true },
        );
      },
      onFinish: async (message) => {
        const chatIdToUse = submissionChatIdRef.current;
        if (chatIdToUse) {
          try {
            await createMessage(chatIdToUse, 'assistant', message.content);
            console.log('✅ [CHAT PAGE] Saved assistant message');
          } catch (error) {
            console.error('❌ [CHAT PAGE] Failed to save assistant message:', error);
          }
        }
        submissionChatIdRef.current = null;
      },
    });
  
  // Auto-trigger AI response for new chats (simplified)
  useEffect(() => {
    if (isInitialized && messages.length === 1 && messages[0].role === 'user') {
      console.log('[CHAT PAGE] Auto-triggering AI response for first message');
      submissionChatIdRef.current = chatId;
      reload();
    }
  }, [isInitialized, messages, chatId, reload]);

  // Handle form submission
  const handleChatSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    try {
      submissionChatIdRef.current = chatId;
      
      // Save user message to database
      if (chatId) {
        await createMessage(chatId, 'user', input.trim());
      }
      
      handleSubmit(e, { data: { chatId } });
      
    } catch (error) {
      console.error('❌ [CHAT PAGE] Error handling chat submit:', error);
      toast.error('Failed to save message');
    }
  };

  // Handle thread switching - prevent LLM retriggering
  const handleThreadSelect = (newChatId: string) => {
    if (newChatId && newChatId !== chatId) {
      stop();
      router.push(`/c/${newChatId}`);
    }
  };

  const handleNewChat = () => {
    stop();
    clearCurrentChat();
    router.push('/');
  };

  if (!storeInitialized || !isInitialized) {
    return (
      <AuthWrapper>
        <div className="flex h-screen w-screen items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      </AuthWrapper>
    );
  }

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <AuthWrapper>
      <div className="w-full min-h-screen">
        {/* Fixed header with navigation */}
        <div className="fixed top-4 left-4 flex flex-col gap-2 z-50">
          <div className="text-4xl font-bold text-primary dark:text-primary tracking-tight hover:opacity-80 transition-opacity cursor-pointer font-title-rounded"
               onClick={() => router.push('/')}>
            AskED
          </div>
        </div>

        {/* Top right controls */}
        <div className="fixed top-4 right-4 flex items-center gap-3 z-50">
          <ThreadsButton onThreadSelect={handleThreadSelect} />
          <NewChatButton onNewChat={handleNewChat} />
          <SyncButton />
          <ThemeToggle />
          <SettingsButton />
        </div>

        <TimeDisplay />

        {/* Chat messages */}
        <div className="animate-in fade-in duration-300">
          <Messages 
            messages={messages} 
            isLoading={isLoading} 
            status={status} 
          />
        </div>
        
        {/* Fixed input at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-transparent p-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="w-full max-w-xl mx-auto px-4">
            <form onSubmit={handleChatSubmit} className="w-full">
              <div className="transform transition-all duration-300 ease-in-out">
                <PromptInputWithActions
                  value={input}
                  onValueChange={(value: string) =>
                    handleInputChange({
                      target: { value },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                  onSubmit={handleChatSubmit}
                  isLoading={isLoading}
                  onStop={stop}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
} 