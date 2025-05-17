import { eq } from "drizzle-orm";
import db from "./database";
import * as schema from "./schema";

// Helper functions for working with threads and messages
export async function createThread(title = "New conversation") {
	const [thread] = await db
		.insert(schema.threads)
		.values({ title })
		.returning();
	return thread;
}

export async function getThread(id: number) {
	return await db.query.threads.findFirst({
		where: (threads) => eq(threads.id, id),
		with: {
			messages: {
				orderBy: (messages: typeof schema.messages.$inferSelect) => [
					messages.createdAt,
				],
			},
		},
	});
}

export async function getAllThreads() {
	return await db.query.threads.findMany({
		orderBy: (threads) => [threads.updatedAt],
	});
}

export async function addMessage(
	threadId: number,
	role: "user" | "assistant",
	content: string,
) {
	const [message] = await db
		.insert(schema.messages)
		.values({ threadId, role, content })
		.returning();

	// Update the thread's updatedAt timestamp
	await db
		.update(schema.threads)
		.set({ updatedAt: new Date() })
		.where(eq(schema.threads.id, threadId));

	return message;
}
