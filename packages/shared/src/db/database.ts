import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

// This is a factory function that creates a database client
// It's exported from the shared package so that both the web and extension can use it
export const createDb = (connectionString?: string) => {
  return drizzle({ schema });
};

// Export the schema for use in migrations and other places
export { schema }; 