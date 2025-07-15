import { create } from "zustand";
import {
  initializeLocalDatabase,
  getChatWithMessages,
  createChat,
  createMessage,
} from "@/lib/db/local";
import type { Message } from "ai";
import { defaultModel, type modelID } from "@/ai/providers";

interface ChatState {
  chatId: string | null;
  messages: Message[];
  selectedModel: modelID;
  isInitialized: boolean;
  isLoadingMessages: boolean;
  
  // Core methods
  initialize: () => Promise<void>;
  setChatId: (chatId: string | null) => void;
  setSelectedModel: (model: modelID) => void;
  setMessages: (messages: Message[]) => void;
  
  // Chat operations
  loadChat: (chatId: string) => Promise<Message[]>;
  createNewChat: (firstMessageContent: string) => Promise<string>;
  clearCurrentChat: () => void;
}

const useChatStoreImplementation = create<ChatState>((set, get) => ({
  chatId: null,
  messages: [],
  selectedModel: defaultModel,
  isInitialized: false,
  isLoadingMessages: false,

  initialize: async () => {
    if (get().isInitialized) return;
    try {
      await initializeLocalDatabase();
      set({ isInitialized: true });
      console.log('✅ [ChatStore] Database initialized');
    } catch (error) {
      console.error('❌ [ChatStore] Failed to initialize database:', error);
    }
  },

  setChatId: (chatId: string | null) => {
    console.log('🔍 [ChatStore] Setting chatId to:', chatId);
    set({ chatId });
    // Don't automatically load - let components control when to load
  },

  setSelectedModel: (model: modelID) => {
    set({ selectedModel: model });
  },

  setMessages: (messages: Message[]) => {
    set({ messages });
  },

  loadChat: async (chatId: string): Promise<Message[]> => {
    if (!get().isInitialized) {
      await get().initialize();
    }
    
    set({ isLoadingMessages: true });
    try {
      console.log('🔍 [ChatStore] Loading chat:', chatId);
      const { chat, messages: dbMessages } = await getChatWithMessages(chatId);
      
      if (chat) {
        const aiMessages = dbMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          createdAt: new Date(msg.createdAt),
        }));
        
        set({ messages: aiMessages });
        console.log('✅ [ChatStore] Loaded', aiMessages.length, 'messages');
        return aiMessages;
      } else {
        set({ messages: [] });
        console.log('🔍 [ChatStore] Chat not found:', chatId);
        return [];
      }
    } catch (error) {
      console.error('❌ [ChatStore] Error loading messages:', error);
      set({ messages: [] });
      return [];
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  createNewChat: async (firstMessageContent: string): Promise<string> => {
    if (!get().isInitialized) {
      await get().initialize();
    }

    const generateChatTitle = async (message: string): Promise<string> => {
      try {
        const response = await fetch('/api/chat/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        if (!response.ok) throw new Error('Failed to generate title');
        const { title } = await response.json();
        return title;
      } catch (error) {
        console.error('Error generating chat title:', error);
        return message.slice(0, 50) + (message.length > 50 ? '...' : '');
      }
    };
      
    console.log('🔍 [ChatStore] Creating new chat...');
    const title = await generateChatTitle(firstMessageContent);
    const newChat = await createChat(title);
    
    // Save the first user message immediately
    console.log('🔍 [ChatStore] Saving first message to chat:', newChat.id);
    await createMessage(newChat.id, 'user', firstMessageContent);
    
    // Set chatId and load the messages
    set({ chatId: newChat.id });
    await get().loadChat(newChat.id);
    
    console.log('✅ [ChatStore] Created chat and saved first message:', newChat.id);
    return newChat.id;
  },

  clearCurrentChat: () => {
    console.log('🔍 [ChatStore] Clearing current chat');
    set({ chatId: null, messages: [] });
  }
}));

// Initialize the store when the module is loaded
useChatStoreImplementation.getState().initialize();

export const useChatStore = useChatStoreImplementation; 