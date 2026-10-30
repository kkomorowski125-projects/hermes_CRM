// Pomocnicze funkcje testów API: świeża baza (SQLite w pamięci albo PostgreSQL z TEST_DATABASE_URL) i klient z ciasteczkami.
import pg from 'pg';
import { buildApp } from '../src/app.js';
import { openDb } from '../src/db.js';

export async function freshApp(cfg: Record<string, unknown> = {}, opts: { mailer?: import('../src/mail.js').Mailer } = {}) {
  const url = process.env.TEST_DATABASE_URL || '';
  if (url) {
    const c = new pg.Client({ connectionString: url });
    await c.connect(); await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;'); await c.end();
  }
  const db = await openDb({ databaseUrl: url, sqlitePath: ':memory:' });
  const app = await buildApp({ publicUrl: 'http://test', dev: true, ...cfg }, { db, logger: false, ...opts });
  return { app, db, close: async () => { await app.close(); await db.close(); } };
}

export function client(app: Awaited<ReturnType<typeof buildApp>>) {
  let cookie = '';
  const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = { 'x-hermes': '1' }) => {
    const res = await app.inject({ method: method as any, url, payload: body as any, headers: { ...headers, ...(cookie ? { cookie } : {}) } });
    const sc = res.headers['set-cookie'];
    if (sc) { const v = (Array.isArray(sc) ? sc[0] : sc).split(';')[0]; cookie = v.endsWith('=') ? '' : v; }
    let json: any = null; try { json = res.json(); } catch { /* html */ }
    return { status: res.statusCode, json, body: res.body };
  };
  return {
    get: (u: string) => call('GET', u), post: (u: string, b?: unknown) => call('POST', u, b ?? {}),
    patch: (u: string, b?: unknown) => call('PATCH', u, b ?? {}), del: (u: string) => call('DELETE', u),
    raw: call, get cookie() { return cookie; }
  };
}
export const owner = { name: 'Kamil Komorowski', company: 'Przewaga', email: 'kamil@przewaga.pl', password: 'tajnehaslo123' };
