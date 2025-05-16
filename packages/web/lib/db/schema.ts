import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const threads = pgTable('threads', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').references(() => threads.id).notNull(),
  role: text('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Thread = typeof threads.$inferSelect;
export type Message = typeof messages.$inferSelect;
