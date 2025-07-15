import { create } from "zustand";
import {
  initializeLocalDatabase,
  getChatWithMessages,
  createChat,
  createMessage,
} from "@/lib/db/local";
import type { Message } from "ai";

interface ChatState {
  chatId: string | null;
  messages: Message[];
  isInitialized: boolean;
  isLoadingMessages: boolean;
  initialize: () => Promise<void>;
  setChatId: (chatId: string | null) => void;
  startNewChat: () => void;
  loadChat: (chatId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  createAndSwitchToNewChat: (firstMessageContent: string) => Promise<string>;
}

const useChatStoreImplementation = create<ChatState>((set, get) => ({
  chatId: null,
  messages: [],
  isInitialized: false,
  isLoadingMessages: false,

  initialize: async () => {
    if (get().isInitialized) return;
    try {
      await initializeLocalDatabase();
      set({ isInitialized: true });
      console.log('✅ [ChatStore] Local database initialized');
    } catch (error) {
      console.error('❌ [ChatStore] Failed to initialize local database:', error);
    }
  },

  setChatId: (chatId: string | null) => {
    console.log('🔍 [ChatStore] Setting chatId to:', chatId);
    if (get().chatId === chatId) return;
    
    set({ chatId });

    if (chatId) {
      get().loadChat(chatId);
    } else {
      set({ messages: [] });
    }
  },

  startNewChat: () => {
    console.log('🔍 [ChatStore] Starting new chat');
    get().setChatId(null);
  },

  loadChat: async (chatId: string) => {
    if (!get().isInitialized) {
      await get().initialize();
    }
    set({ isLoadingMessages: true });
    try {
      console.log('🔍 [ChatStore] Loading messages for chat:', chatId);
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
      } else {
        set({ messages: [] });
        console.log('🔍 [ChatStore] Chat not found:', chatId);
      }
    } catch (error) {
      console.error('❌ [ChatStore] Error loading messages:', error);
      set({ messages: [] });
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  setMessages: (messages: Message[]) => {
    set({ messages });
  },

  createAndSwitchToNewChat: async (firstMessageContent: string): Promise<string> => {
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
    get().setChatId(newChat.id);
    console.log('✅ [ChatStore] Created and switched to new chat:', newChat.id);
    return newChat.id;
  }
}));

// Initialize the store when the module is loaded
useChatStoreImplementation.getState().initialize();


export const useChatStore = useChatStoreImplementation; 