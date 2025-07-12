import { initializeLocalTables } from './operations';

let initialized = false;

export async function initializeLocalDatabase(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    await initializeLocalTables();
    initialized = true;
    console.log('✅ Local database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize local database:', error);
    throw error;
  }
}

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
  initializeLocalDatabase().catch(console.error);
} 