import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';

// Create PGLite instance with IndexedDB storage for browser
const client = new PGlite({
  dataDir: 'idb://chat-db', // Use IndexedDB for browser storage
});

// Create drizzle instance with schema
export const localDb = drizzle(client, { schema });

// Export client for direct access if needed
export { client as localClient }; 