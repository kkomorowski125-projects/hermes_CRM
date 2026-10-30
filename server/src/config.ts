// Konfiguracja z zmiennych środowiskowych. Wartości domyślne pozwalają uruchomić serwer lokalnie bez pliku .env.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export const config = {
  port: num(process.env.PORT, 3000),
  host: process.env.HOST || '0.0.0.0',
  /** postgres://… dla PostgreSQL; pusty = SQLite w pliku SQLITE_PATH */
  databaseUrl: process.env.DATABASE_URL || '',
  sqlitePath: process.env.SQLITE_PATH || path.resolve(here, '..', 'data', 'hermes.db'),
  /** Plik frontendu serwowany pod / */
  appFile: process.env.APP_FILE || path.resolve(here, '..', '..', 'index.html'),
  /** Adres aplikacji używany w linkach zaproszeń i resetu hasła */
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),
  /** Ciasteczka tylko przez HTTPS (włącz w produkcji) */
  secureCookies: process.env.SECURE_COOKIES === 'true',
  sessionDays: num(process.env.SESSION_DAYS, 30),
  /** Rejestracja nowych firm: open (każdy) albo closed (tylko zaproszenia) */
  signup: (process.env.SIGNUP || 'open') as 'open' | 'closed',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  anthropicVersion: process.env.ANTHROPIC_VERSION || '2026-10-21',
  aiDailyLimit: num(process.env.AI_DAILY_LIMIT, 200),
  /** W trybie deweloperskim linki resetu i zaproszeń wracają w odpowiedzi API */
  dev: process.env.NODE_ENV !== 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  /** Wysyłka maili: smtp://użytkownik:hasło@host:587 albo smtps://…:465; puste = maile tylko w logu */
  smtpUrl: process.env.SMTP_URL || '',
  mailFrom: process.env.MAIL_FROM || 'Hermes CRM <no-reply@localhost>',
  /** Logowanie Google i Microsoft (OpenID Connect); puste = przycisk ukryty */
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  microsoftTenant: process.env.MICROSOFT_TENANT || 'common',
  /** Adres webhooka (Slack, Teams, Discord) dla alertów o błędach serwera */
  alertWebhook: process.env.ALERT_WEBHOOK_URL || '',
  /** Poranny plan dnia mailem: godzina wysyłki w strefie Europe/Warsaw, puste = wyłączony */
  digestHour: process.env.DIGEST_HOUR === '' ? -1 : num(process.env.DIGEST_HOUR, 7),
  /** Wyszukiwanie firm po NIP w Białej liście MF */
  nipApi: process.env.NIP_API_URL || 'https://wl-api.mf.gov.pl',
  /** Tylko testy: podmiana adresów dostawców logowania */
  oauthOverride: {} as Record<string, { auth?: string; token?: string }>
};
export type Config = typeof config;
