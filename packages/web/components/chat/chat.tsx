"use client";

import { defaultModel, type modelID } from "@/ai/providers";
import { PromptInputWithActions } from "@/components/chat/input";
import { Messages } from "@/components/chat/messages";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createMessage } from "@/lib/db/local";
import { useChatStore } from "@/lib/stores/chat-store";


export default function Chat() {
  const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
  const submissionChatIdRef = useRef<string | null>(null);

  const { 
    chatId, 
    messages: storeMessages, 
    isInitialized, 
    setMessages: setStoreMessages, 
    createAndSwitchToNewChat 
  } = useChatStore();

  const { messages, input, handleInputChange, handleSubmit, status, stop, setMessages } =
    useChat({
      api: '/api/chat',
      body: {
        selectedModel,
      },
      initialMessages: storeMessages,
      onError: (error) => {
        console.error('❌ [Chat] useChat error:', error);
        toast.error(
          error.message.length > 0
            ? error.message
            : "An error occurred, please try again later.",
          { position: "top-center", richColors: true },
        );
      },
      onFinish: async (message) => {
        const chatIdToUse = submissionChatIdRef.current;
        console.log('🚨 [Chat] ===== ONFINISH CALLBACK TRIGGERED =====');
        if (chatIdToUse) {
          try {
            await createMessage(chatIdToUse, 'assistant', message.content);
          } catch (error) {
            console.error('❌ [Chat] Failed to save assistant message:', error);
          }
        }
        submissionChatIdRef.current = null; // Reset ref
      },
    });
  
  // Sync useChat messages with the Zustand store
  useEffect(() => {
    setStoreMessages(messages);
  }, [messages, setStoreMessages]);
  
  // When the chat from the store changes, update the AI SDK chat state
  useEffect(() => {
    if (chatId && storeMessages) {
      setMessages(storeMessages);
    } else if (!chatId) {
      setMessages([]);
    }
  }, [chatId, setMessages]); // storeMessages is not a dependency to avoid loops


  // Override handleSubmit to save messages to local database
  const handleChatSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    try {
      let currentChatId = chatId;
      
      if (!currentChatId) {
        currentChatId = await createAndSwitchToNewChat(input.trim());
      }

      submissionChatIdRef.current = currentChatId;

      if (currentChatId) {
        await createMessage(currentChatId, 'user', input.trim());
      }
      
      handleSubmit(e, { data: { chatId: currentChatId } });
      
    } catch (error) {
      console.error('❌ [Chat] Error handling chat submit:', error);
      toast.error('Failed to save message');
    }
  };

  if (!isInitialized) {
    return null;
  }

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="w-full min-h-screen">
      <Messages 
        messages={messages} 
        isLoading={isLoading} 
        status={status} 
      />
      
      {/* Fixed input at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-transparent p-4">
        <div className="w-full max-w-xl mx-auto px-4">
          <form onSubmit={handleChatSubmit} className="w-full">
            <PromptInputWithActions
              value={input}
              onValueChange={(value) =>
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
          </form>
        </div>
      </div>
    </div>
  );
}
