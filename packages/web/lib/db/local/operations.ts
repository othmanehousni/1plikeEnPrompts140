import { eq, desc, asc, count } from 'drizzle-orm';
import { localDb } from './connection';
import { chats, messages, type Chat, type NewChat, type Message, type NewMessage } from './schema';

// Chat operations
export async function createChat(title: string): Promise<Chat> {
  const [newChat] = await localDb
    .insert(chats)
    .values({ title })
    .returning();
  return newChat;
}

export async function getAllChats(): Promise<Chat[]> {
  return await localDb
    .select()
    .from(chats)
    .orderBy(desc(chats.updatedAt));
}

export async function getChatById(id: string): Promise<Chat | null> {
  const result = await localDb
    .select()
    .from(chats)
    .where(eq(chats.id, id))
    .limit(1);
  return result[0] || null;
}

export async function updateChatTitle(id: string, title: string): Promise<Chat | null> {
  const [updatedChat] = await localDb
    .update(chats)
    .set({ 
      title,
      updatedAt: new Date()
    })
    .where(eq(chats.id, id))
    .returning();
  return updatedChat || null;
}

export async function deleteChat(id: string): Promise<boolean> {
  try {
    // Messages will be cascade deleted due to foreign key constraint
    await localDb.delete(chats).where(eq(chats.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
}

// Message operations
export async function createMessage(
  chatId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<Message> {
  const [newMessage] = await localDb
    .insert(messages)
    .values({
      chatId,
      role,
      content,
    })
    .returning();
  
  // Update chat's updatedAt timestamp
  await localDb
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));
  
  return newMessage;
}

export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
  return await localDb
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
}

export async function getChatWithMessages(chatId: string): Promise<{
  chat: Chat | null;
  messages: Message[];
}> {
  const chat = await getChatById(chatId);
  const chatMessages = chat ? await getMessagesByChatId(chatId) : [];
  
  return {
    chat,
    messages: chatMessages,
  };
}

// Utility functions
export async function getChatCount(): Promise<number> {
  const result = await localDb
    .select({ count: count() })
    .from(chats);
  return Number(result[0]?.count) || 0;
}

export async function getMessageCount(): Promise<number> {
  const result = await localDb
    .select({ count: count() })
    .from(messages);
  return Number(result[0]?.count) || 0;
}

// Initialize database tables
export async function initializeLocalTables(): Promise<void> {
  try {
    // Create tables if they don't exist
    await localDb.execute(`
      CREATE TABLE IF NOT EXISTS "chats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await localDb.execute(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
        "role" varchar(50) NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ Local database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing local database tables:', error);
  }
} 