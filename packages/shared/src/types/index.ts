import type { InferModel } from "drizzle-orm";
import type * as schema from "../db/schema";

// Infer the types from the schema
export type User = InferModel<typeof schema.users>;
export type Message = InferModel<typeof schema.messages>;

// Common types used across both web app and extension
export interface AppConfig {
  theme: "light" | "dark" | "system";
  language: string;
}

// Add more shared types as needed 