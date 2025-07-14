"use client";

import { defaultModel, getProviderOptions, type modelID } from "@/ai/providers";
import { PromptInputWithActions } from "@/components/chat/input";
import { Messages } from "@/components/chat/messages";
import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { 
  createChat, 
  createMessage, 
  getChatWithMessages, 
  updateChatTitle,
  initializeLocalDatabase 
} from "@/lib/db/local";

interface ChatProps {
  chatId?: string;
  onChatChange?: (chatId: string) => void;
}

export default function Chat({ chatId: propChatId, onChatChange }: ChatProps = {}) {
  const [selectedModel, setSelectedModel] = useState<modelID>(defaultModel);
  const [chatId, setChatId] = useState<string | null>(propChatId || null);
  const [isInitialized, setIsInitialized] = useState(false);
  const submissionChatIdRef = useRef<string | null>(null);

  // Initialize local database
  useEffect(() => {
    const init = async () => {
      try {
        await initializeLocalDatabase();
        setIsInitialized(true);
        console.log('✅ [Chat] Local database initialized');
      } catch (error) {
        console.error('❌ [Chat] Failed to initialize local database:', error);
        toast.error('Failed to initialize local database');
      }
    };

    init();
  }, []);

  const { messages, input, handleInputChange, handleSubmit, status, stop, setMessages } =
    useChat({
      api: '/api/chat',
      body: {
        selectedModel,
      },
      initialMessages: [],
      onError: (error) => {
        console.error('❌ [Chat] useChat error:', error);
        console.error('❌ [Chat] useChat error details:', JSON.stringify(error, null, 2));
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
        console.log('✅ [Chat] useChat onFinish called with message:', message);
        console.log('✅ [Chat] chatId from ref:', chatIdToUse);
        console.log('✅ [Chat] Message content:', message.content);
        console.log('✅ [Chat] Message role:', message.role);

        // Save assistant message to local database
        if (chatIdToUse) {
          try {
            const savedMessage = await createMessage(chatIdToUse, 'assistant', message.content);
            console.log('✅ [Chat] Assistant message saved to local database:', savedMessage);
          } catch (error) {
            console.error('❌ [Chat] Failed to save assistant message:', error);
          }
        } else {
          console.log('⚠️ [Chat] No chatId available, cannot save assistant message');
        }
        submissionChatIdRef.current = null; // Reset ref
      },
      onResponse: (response) => {
        console.log('🔍 [Chat] useChat onResponse called:', response);
      },
      onToolCall: (toolCall) => {
        console.log('🔍 [Chat] useChat onToolCall called:', toolCall);
      },
    });

  // Update chat ID when prop changes
  useEffect(() => {
    if (propChatId && propChatId !== chatId) {
      console.log('🔍 [Chat] ChatId changed from', chatId, 'to', propChatId);
      setChatId(propChatId);
    } else if (propChatId === '' && chatId !== null) {
      // Handle new chat (empty string means start fresh)
      console.log('🔍 [Chat] Starting new chat - clearing messages and chatId');
      setChatId(null);
      setMessages([]);
      submissionChatIdRef.current = null;
    }
  }, [propChatId, chatId, setMessages]);

  // Load existing messages when chatId changes
  useEffect(() => {
    const loadExistingMessages = async () => {
      if (!isInitialized) {
        console.log('🔍 [Chat] Skipping message loading - not initialized');
        return;
      }

      if (!chatId) {
        console.log('🔍 [Chat] No chatId - clearing messages for new chat');
        setMessages([]);
        return;
      }

      try {
        console.log('🔍 [Chat] Loading existing messages for chat:', chatId);
        const { chat, messages: dbMessages } = await getChatWithMessages(chatId);
        
        console.log('🔍 [Chat] Database query result:', {
          chat: chat ? { id: chat.id, title: chat.title } : null,
          messagesCount: dbMessages.length,
          messages: dbMessages.map(msg => ({ id: msg.id, role: msg.role, content: msg.content.slice(0, 50) + '...' }))
        });
        
        if (chat) {
          if (dbMessages.length > 0) {
            // Transform database messages to AI SDK format
            const aiMessages = dbMessages.map((msg) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
              createdAt: msg.createdAt,
            }));
            
            setMessages(aiMessages);
            console.log('✅ [Chat] Loaded', aiMessages.length, 'existing messages:', aiMessages);
          } else {
            console.log('🔍 [Chat] Chat found but no messages in database');
            setMessages([]);
          }
        } else {
          console.log('🔍 [Chat] Chat not found in database');
          setMessages([]);
        }
      } catch (error) {
        console.error('❌ [Chat] Error loading existing messages:', error);
      }
    };

    loadExistingMessages();
  }, [chatId, isInitialized, setMessages]);

  const isLoading = status === "streaming" || status === "submitted";
  
  // Debug status changes
  useEffect(() => {
    console.log('🔍 [Chat] Status changed:', status, 'isLoading:', isLoading);
  }, [status, isLoading]);
  
  // Debug messages changes and save assistant messages
  useEffect(() => {
    console.log('🔍 [Chat] Messages changed:', messages.length, 'messages:', messages);
    
    // Check for new assistant messages that need to be saved
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && chatId && status === 'ready') {
      console.log('🔍 [Chat] Detected new assistant message when status is ready:', lastMessage);
      
      // Check if this message is already in the database by checking if it has a non-AI SDK ID format
      const hasDbId = lastMessage.id && lastMessage.id.includes('-') && lastMessage.id.length > 20;
      
      if (!hasDbId) {
        console.log('🔍 [Chat] Assistant message appears to be new (no DB ID), saving to database...');
        
        // Save the assistant message
        const saveAssistantMessage = async () => {
          try {
            const savedMessage = await createMessage(chatId, 'assistant', lastMessage.content);
            console.log('✅ [Chat] Assistant message saved to local database via messages effect:', savedMessage);
          } catch (error) {
            console.error('❌ [Chat] Failed to save assistant message via messages effect:', error);
          }
        };
        
        saveAssistantMessage();
      } else {
        console.log('🔍 [Chat] Assistant message already appears to be from database (has DB ID)');
      }
    }
  }, [messages, chatId, status]);
  


  // Function to generate chat title using server-side API
  const generateChatTitle = async (message: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat/title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate title');
      }

      const { title } = await response.json();
      return title;
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback to simple title
      return message.slice(0, 50) + (message.length > 50 ? '...' : '');
    }
  };

  // Override handleSubmit to save messages to local database
  const handleChatSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    console.log('🔍 [Chat] handleChatSubmit called with input:', input.trim());
    
    if (e) {
      e.preventDefault();
    }
    
    if (!input.trim()) {
      console.log('🔍 [Chat] No input provided, returning early');
      return;
    }

    try {
      let currentChatId = chatId;
      
      // Create new chat if needed
      if (!currentChatId) {
        console.log('🔍 [Chat] Creating new chat...');
        const title = await generateChatTitle(input.trim());
        const newChat = await createChat(title);
        currentChatId = newChat.id;
        setChatId(currentChatId);
        onChatChange?.(currentChatId);
        console.log('✅ [Chat] Created new chat:', currentChatId);
      }

      submissionChatIdRef.current = currentChatId;

      // Save user message to local database
      if (currentChatId) {
        console.log('🔍 [Chat] Saving user message to database...');
        const savedUserMessage = await createMessage(currentChatId, 'user', input.trim());
        console.log('✅ [Chat] User message saved to local database:', savedUserMessage);
      }

      // Let AI SDK handle the submit
      console.log('🔍 [Chat] Calling handleSubmit with messages:', messages.length);
      console.log('🔍 [Chat] Current status:', status);
      console.log('🔍 [Chat] Current chatId before submit:', currentChatId);
      
      handleSubmit(e, { data: { chatId: currentChatId } });
      console.log('🔍 [Chat] ChatId after submit:', chatId);
      
    } catch (error) {
      console.error('❌ [Chat] Error handling chat submit:', error);
      toast.error('Failed to save message');
    }
  };

  // Function to start a new conversation
  const startNewChat = () => {
    setChatId(null);
    setMessages([]);
    submissionChatIdRef.current = null;
    onChatChange?.('');
  };

  if (!isInitialized) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing chat...</p>
        </div>
      </div>
    );
  }

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
