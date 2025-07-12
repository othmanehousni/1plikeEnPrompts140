import { Mastra } from "@mastra/core";
import { Memory } from "@mastra/memory";
import { UpstashStore } from "@mastra/upstash";
import { createChatAgent } from "./agents/chat-agent";
import { openai } from "@ai-sdk/openai";

// Initialize Upstash storage for persistent memory
const storage = new UpstashStore({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Configure Memory with semantic recall and working memory
export const memory = new Memory({
    storage,
    options: {
        lastMessages: 10, // Include last 10 messages in context
        workingMemory: {
            enabled: true,
            scope: 'resource', // Persist user profile across all threads
        },
        threads: {
            generateTitle: {
                model: openai("gpt-4.1-nano"), // Use cheaper model for titles
                instructions: "Generate a concise title for this conversation based on the first user message.",
            },
        },
    },
});

// Create the chat agent with memory
const chatAgent = createChatAgent(memory);

// Initialize Mastra with agents as an object
export const mastra = new Mastra({
    agents: { chatAgent }, // Use object format instead of array
});

// Export the configured agent for use in API routes
export { chatAgent };
