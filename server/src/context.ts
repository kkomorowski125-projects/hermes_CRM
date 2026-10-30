// Wspólne typy i pomocnicze funkcje tras: sesja, uprawnienia, dziennik zmian, błędy.
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db, Row } from './db.js';
import { newId, now, sha256 } from './security.js';
import type { Config } from './config.js';
import type { Mailer } from './mail.js';

export type Role = 'admin' | 'sales' | 'viewer';
export const ROLES: Role[] = ['admin', 'sales', 'viewer'];
export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrator', sales: 'Handlowiec', viewer: 'Podgląd' };
export const COOKIE = 'hermes_session';

export interface Ctx {
  sessionId: string;
  user: { id: string; email: string; name: string; totp_enabled: boolean; prefs: Record<string, unknown> };
  org: { id: string; name: string; settings: Record<string, unknown> };
  role: Role;
  visibility: 'all' | 'own';
}
declare module 'fastify' {
  interface FastifyRequest { ctx?: Ctx }
  interface FastifyInstance { db: Db; cfg: Config; mail: Mailer; alert: (title: string, detail: Record<string, unknown>) => Promise<boolean> }
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public extra: Record<string, unknown> = {}) { super(message); }
}
export const bad = (code: string, message: string, extra = {}) => new HttpError(400, code, message, extra);
export const parseJson = <T = Record<string, unknown>>(s: unknown, d: T): T => { try { return s ? JSON.parse(String(s)) : d; } catch { return d; } };

export async function loadCtx(db: Db, token: string | undefined): Promise<Ctx | undefined> {
  if (!token) return;
  const sid = sha256(token);
  const s = await db.one(`SELECT s.id, s.user_id, s.org_id, s.expires_at, u.email, u.name, u.totp_enabled, u.prefs,
      o.name AS org_name, o.settings, m.role, m.visibility
    FROM sessions s JOIN users u ON u.id = s.user_id JOIN orgs o ON o.id = s.org_id
    JOIN memberships m ON m.org_id = s.org_id AND m.user_id = s.user_id WHERE s.id = ?`, [sid]);
  if (!s || s.expires_at < now()) return;
  return {
    sessionId: sid,
    user: { id: s.user_id, email: s.email, name: s.name, totp_enabled: !!Number(s.totp_enabled), prefs: parseJson(s.prefs, {}) },
    org: { id: s.org_id, name: s.org_name, settings: parseJson(s.settings, {}) },
    role: s.role, visibility: s.visibility === 'own' ? 'own' : 'all'
  };
}
export function need(req: FastifyRequest, ...roles: Role[]): Ctx {
  const c = req.ctx;
  if (!c) throw new HttpError(401, 'unauthenticated', 'Zaloguj się.');
  if (roles.length && !roles.includes(c.role)) throw new HttpError(403, 'forbidden', 'Brak uprawnień do tej operacji.');
  return c;
}
export async function audit(db: Db, c: { orgId: string; userId?: string | null }, action: string, type: string | null = null, recordId: string | null = null, detail: unknown = null) {
  await db.run('INSERT INTO audit_log (id, org_id, user_id, action, type, record_id, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [newId('a_'), c.orgId, c.userId || null, action, type, recordId, detail == null ? null : JSON.stringify(detail), now()]);
}
export async function createSession(db: Db, reply: FastifyReply, cfg: Config, userId: string, orgId: string, token: string) {
  const exp = new Date(Date.now() + cfg.sessionDays * 864e5).toISOString();
  await db.run('INSERT INTO sessions (id, user_id, org_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)', [sha256(token), userId, orgId, exp, now()]);
  reply.setCookie(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure: cfg.secureCookies, expires: new Date(exp) });
}
export async function members(db: Db, orgId: string): Promise<Row[]> {
  const rows = await db.all(`SELECT u.id, u.email, u.name, m.role, m.visibility, m.title, m.target, m.created_at
    FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? ORDER BY m.created_at`, [orgId]);
  return rows.map(r => ({ ...r, target: r.target == null ? null : Number(r.target) }));
}
