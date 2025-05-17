import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the SQL file
const sql = fs.readFileSync(path.join(__dirname, '..', 'drizzle', 'custom_migration.sql'), 'utf8');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// Create postgres client
const client = postgres(process.env.DATABASE_URL, {
  ssl: 'require' // For Supabase connections
});

async function runMigration() {
  try {
    console.log('Running custom migration...');
    // Execute the SQL
    await client.unsafe(sql);
    console.log('Migration successfully applied!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    // Close the connection
    await client.end();
  }
}

runMigration(); 