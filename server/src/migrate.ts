// Uruchamia migracje bazy bez startu serwera (np. w potoku wdrożenia).
import { openDb } from './db.js';
import { config } from './config.js';

const db = await openDb({ databaseUrl: config.databaseUrl, sqlitePath: config.sqlitePath });
console.log(`Migracje wykonane (${db.kind})`);
await db.close();
