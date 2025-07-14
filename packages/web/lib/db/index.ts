import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Check if the DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set for runtime connection.");
}

// Create a PostgreSQL client connection
// For Supabase, SSL is typically required.
// Check your Supabase project's database settings for the exact connection string
// and whether it uses PgBouncer (which might affect direct SSL options).
const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require' // Common requirement for Supabase connections
});

// Create Drizzle instance with the postgres-js driver - this is for EdStem data
export const db = drizzle(client, { schema });

// The schema object is already exported by drizzle, but if you need direct access to your schema definitions:
export * from "./schema"; 

export default db; // Exporting db as default can be useful for some setups 

// Note: Local chat database is exported from ./local/ 