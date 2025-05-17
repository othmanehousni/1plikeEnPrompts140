import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

// Ensure DATABASE_URL is set for Supabase
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please provide your Supabase connection string.');
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config; 