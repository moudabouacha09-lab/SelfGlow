import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

// Initialize the Expo SQLite database synchronously
export const expoDb = openDatabaseSync('selfglow.db', { enableChangeListener: true });

// Export the initialized Drizzle ORM instance
export const db = drizzle(expoDb);
