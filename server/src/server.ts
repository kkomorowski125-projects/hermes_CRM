// Punkt startowy: buduje serwer i nasłuchuje na PORT (domyślnie 3000).
import { buildApp } from './app.js';
import { config } from './config.js';
import { startJobs } from './routes-growth.js';

const app = await buildApp();
try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Hermes CRM działa: ${config.publicUrl} (baza: ${app.db.kind}, maile: ${app.mail.enabled ? 'SMTP' : 'tylko log'})`);
  startJobs(app);
} catch (e) { app.log.error(e); process.exit(1); }
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await app.close(); process.exit(0); });
