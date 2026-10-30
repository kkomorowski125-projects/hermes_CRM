// Składa serwer: baza, ciasteczka, sesja, ochrona przed CSRF, trasy API i plik aplikacji pod "/".
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fs from 'node:fs';
import { openDb, type Db } from './db.js';
import { config as baseConfig, type Config } from './config.js';
import { COOKIE, HttpError, loadCtx } from './context.js';
import authRoutes from './routes-auth.js';
import orgRoutes from './routes-org.js';
import dataRoutes from './routes-data.js';
import aiRoutes from './routes-ai.js';
import oauthRoutes from './routes-oauth.js';
import monitorRoutes, { alerter } from './monitor.js';
import crypto from 'node:crypto';
import { createMailer, type Mailer } from './mail.js';

const VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version as string;

export async function buildApp(overrides: Partial<Config> = {}, opts: { db?: Db; logger?: boolean; mailer?: Mailer } = {}) {
  const cfg: Config = { ...baseConfig, ...overrides };
  const app = Fastify({ logger: opts.logger === false ? false : { level: cfg.logLevel, redact: ['req.headers.cookie', 'req.headers.authorization'] }, bodyLimit: 10 * 1024 * 1024, trustProxy: true, genReqId: () => crypto.randomUUID().slice(0, 13) });
  const alert = alerter(cfg.alertWebhook, app.log);
  app.decorate('alert', alert);
  const db = opts.db || await openDb({ databaseUrl: cfg.databaseUrl, sqlitePath: cfg.sqlitePath });
  app.decorate('db', db);
  app.decorate('cfg', cfg);
  app.decorate('mail', opts.mailer || createMailer(cfg, app.log));
  await app.register(cookie);

  app.addHook('onRequest', async req => {
    if (!req.url.startsWith('/api/')) return;
    // Zmiany danych tylko z naszej aplikacji: wymagany nagłówek, którego inna strona nie wyśle bez zgody CORS.
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-hermes'] !== '1') throw new HttpError(403, 'csrf', 'Brak nagłówka x-hermes.');
    req.ctx = await loadCtx(db, req.cookies[COOKIE]);
  });
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'same-origin');
    reply.header('x-frame-options', 'SAMEORIGIN');
    reply.header('x-request-id', _req.id);
    return payload;
  });
  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.code, message: err.message, ...err.extra });
    if (err.validation || err.statusCode === 400) return reply.status(400).send({ error: 'bad_request', message: 'Nieprawidłowe dane w zapytaniu.' });
    if (err.statusCode === 413) return reply.status(413).send({ error: 'too_large', message: 'Za duże zapytanie.' });
    req.log.error(err);
    void alert('błąd serwera', { zapytanie: req.id, adres: `${req.method} ${req.url.split('?')[0]}`, błąd: err?.message || err });
    return reply.status(500).send({ error: 'server_error', message: `Błąd serwera. Spróbuj ponownie. Numer zgłoszenia: ${req.id}.`, requestId: req.id });
  });

  await app.register(authRoutes);
  await app.register(orgRoutes);
  await app.register(dataRoutes);
  await app.register(aiRoutes);
  await app.register(oauthRoutes);
  await app.register(monitorRoutes);

  const started = Date.now();
  app.get('/health', async () => { await db.one('SELECT 1 AS ok'); return { ok: true, db: db.kind, uptime: Math.round((Date.now() - started) / 1000), mail: app.mail.enabled, version: VERSION }; });
  const sendApp = async (_req: unknown, reply: any) => reply.type('text/html; charset=utf-8').header('cache-control', 'no-cache').send(fs.readFileSync(cfg.appFile));
  app.get('/', sendApp);
  app.get('/index.html', sendApp);
  app.addHook('onClose', async () => { if (!opts.db) await db.close(); });
  return app;
}
