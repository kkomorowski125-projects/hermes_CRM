// Logowanie przez Google i Microsoft (OpenID Connect, kod autoryzacji z PKCE).
// Bezpieczeństwo: state i nonce jednorazowe, ważne 10 minut; id_token odbierany bezpośrednio z endpointu tokenów
// przez TLS (OIDC Core 3.1.3.7), sprawdzamy wydawcę, odbiorcę, ważność i nonce.
// Konto łączymy po adresie email tylko wtedy, gdy dostawca potwierdza adres (Google: email_verified).
// Konto Microsoft łączy się z istniejącym kontem w Ustawieniach, po zalogowaniu hasłem.
import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { HttpError, bad, createSession, need, audit, parseJson } from './context.js';
import { newId, newToken, now, sha256, verifyTotp } from './security.js';
import type { Config } from './config.js';

type P = 'google' | 'microsoft';
export const PROVIDER_LABEL: Record<P, string> = { google: 'Google', microsoft: 'Microsoft' };

export function providers(cfg: Config) {
  const o = cfg.oauthOverride || {};
  const list: Partial<Record<P, { id: string; secret: string; auth: string; token: string; issuer: (iss: string) => boolean }>> = {};
  if (cfg.googleClientId && cfg.googleClientSecret) list.google = {
    id: cfg.googleClientId, secret: cfg.googleClientSecret,
    auth: o.google?.auth || 'https://accounts.google.com/o/oauth2/v2/auth',
    token: o.google?.token || 'https://oauth2.googleapis.com/token',
    issuer: iss => iss === 'https://accounts.google.com' || iss === 'accounts.google.com'
  };
  if (cfg.microsoftClientId && cfg.microsoftClientSecret) {
    const t = encodeURIComponent(cfg.microsoftTenant);
    list.microsoft = {
      id: cfg.microsoftClientId, secret: cfg.microsoftClientSecret,
      auth: o.microsoft?.auth || `https://login.microsoftonline.com/${t}/oauth2/v2.0/authorize`,
      token: o.microsoft?.token || `https://login.microsoftonline.com/${t}/oauth2/v2.0/token`,
      issuer: iss => /^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]{36}\/v2\.0$/.test(iss)
    };
  }
  return list;
}

const b64url = (b: Buffer) => b.toString('base64url');
function decodeJwt(t: string): Record<string, any> {
  const part = String(t || '').split('.')[1];
  if (!part) throw new Error('id_token');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

export default async function oauthRoutes(app: FastifyInstance) {
  const { db, cfg } = app;
  const redirectUri = (p: P) => `${cfg.publicUrl}/api/auth/oauth/${p}/callback`;
  const back = (reply: FastifyReply, q: string) => reply.redirect(`${cfg.publicUrl}/?${q}`, 302);
  const putState = async (data: Record<string, unknown>, minutes = 10) => {
    const t = newToken();
    await db.run('INSERT INTO oauth_states (id, data, expires_at) VALUES (?, ?, ?)', [sha256(t), JSON.stringify(data), new Date(Date.now() + minutes * 60e3).toISOString()]);
    return t;
  };
  const takeState = async (t: string, kind?: string) => {
    const id = sha256(String(t || ''));
    const r = await db.one('SELECT data, expires_at FROM oauth_states WHERE id = ?', [id]);
    await db.run('DELETE FROM oauth_states WHERE id = ? OR expires_at < ?', [id, now()]);
    if (!r || r.expires_at < now()) return null;
    const d = parseJson<Record<string, any>>(r.data, {});
    return kind && d.kind !== kind ? null : d;
  };
  const provider = (p: string) => {
    const x = providers(cfg)[p as P];
    if (!x) throw new HttpError(404, 'provider_off', 'To logowanie nie jest włączone na tym serwerze.');
    return x;
  };
  /** Kończy logowanie: z 2FA prosi jeszcze o kod, bez 2FA tworzy sesję. */
  const finish = async (reply: FastifyReply, userId: string, orgId?: string) => {
    const u = await db.one('SELECT totp_enabled FROM users WHERE id = ?', [userId]);
    const m = orgId
      ? await db.one('SELECT org_id FROM memberships WHERE user_id = ? AND org_id = ?', [userId, orgId])
      : await db.one('SELECT org_id FROM memberships WHERE user_id = ? ORDER BY created_at LIMIT 1', [userId]);
    if (!m) return back(reply, 'oauth_error=no_org');
    if (Number(u?.totp_enabled)) return back(reply, 'oauth_totp=' + await putState({ kind: 'totp', userId, orgId: m.org_id }, 5));
    await createSession(db, reply, cfg, userId, m.org_id, newToken());
    await audit(db, { orgId: m.org_id, userId }, 'login', null, null, { via: 'oauth' });
    return back(reply, 'oauth=ok');
  };
  const link = (p: P, sub: string, userId: string, email: string) =>
    db.run('INSERT INTO identities (provider, subject, user_id, email, created_at) VALUES (?, ?, ?, ?, ?)', [p, sub, userId, email || null, now()]);

  app.get('/api/auth/oauth/providers', async () => {
    const list = providers(cfg);
    return { google: !!list.google, microsoft: !!list.microsoft };
  });

  app.get('/api/auth/oauth/:p/start', async (req, reply) => {
    const p = (req.params as any).p as P, x = provider(p), q = req.query as Record<string, string>;
    const mode = q.mode === 'link' ? 'link' : 'login';
    if (mode === 'link' && !req.ctx) return back(reply, 'oauth_error=session');
    const verifier = newToken(), nonce = newToken();
    const state = await putState({ kind: 'auth', p, verifier, nonce, mode, invite: q.invite || '', userId: mode === 'link' ? req.ctx!.user.id : '' });
    const u = new URL(x.auth);
    u.search = new URLSearchParams({
      client_id: x.id, response_type: 'code', redirect_uri: redirectUri(p), scope: 'openid email profile',
      state, nonce, code_challenge: b64url(crypto.createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256', prompt: 'select_account'
    }).toString();
    return reply.redirect(u.toString(), 302);
  });

  app.get('/api/auth/oauth/:p/callback', async (req, reply) => {
    const p = (req.params as any).p as P, q = req.query as Record<string, string>;
    const st = await takeState(q.state, 'auth');
    if (!st || st.p !== p) return back(reply, 'oauth_error=state');
    if (q.error || !q.code) return back(reply, 'oauth_error=cancelled');
    const x = provider(p);
    let claims: Record<string, any>;
    try {
      const res = await fetch(x.token, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code: q.code, redirect_uri: redirectUri(p), client_id: x.id, client_secret: x.secret, code_verifier: st.verifier }).toString()
      });
      const tok: any = await res.json().catch(() => ({}));
      if (!res.ok || !tok.id_token) throw new Error('token ' + res.status);
      claims = decodeJwt(tok.id_token);
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!x.issuer(String(claims.iss)) || !aud.includes(x.id) || !(Number(claims.exp) * 1000 > Date.now()) || claims.nonce !== st.nonce || !claims.sub) throw new Error('claims');
    } catch (e: any) {
      app.log.warn({ provider: p, err: e?.message }, 'Logowanie OAuth nieudane');
      return back(reply, 'oauth_error=provider');
    }
    const sub = String(claims.sub), email = String(claims.email || claims.preferred_username || '').toLowerCase().trim();
    const verified = p === 'google' && claims.email_verified === true && email ? email : '';
    const name = String(claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ') || email.split('@')[0] || 'Użytkownik').slice(0, 200);
    const known = await db.one('SELECT user_id FROM identities WHERE provider = ? AND subject = ?', [p, sub]);

    if (st.mode === 'link') {
      if (known && known.user_id !== st.userId) return back(reply, 'oauth_error=identity_taken');
      if (!known) await link(p, sub, st.userId, email);
      const m = await db.one('SELECT org_id FROM memberships WHERE user_id = ? ORDER BY created_at LIMIT 1', [st.userId]);
      if (m) await audit(db, { orgId: m.org_id, userId: st.userId }, 'identity_linked', null, null, { provider: p });
      return back(reply, 'oauth=linked');
    }
    if (known) return finish(reply, known.user_id);

    if (st.invite) {
      const inv = await db.one('SELECT * FROM invites WHERE id = ?', [sha256(st.invite)]);
      if (!inv || inv.accepted_at || inv.expires_at < now()) return back(reply, 'oauth_error=invite_invalid');
      if (!verified || verified !== inv.email) return back(reply, 'oauth_error=invite_email');
      let u = await db.one('SELECT id FROM users WHERE email = ?', [inv.email]);
      await db.tx(async tx => {
        if (!u) { u = { id: newId('u_') }; await tx.run('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [u.id, inv.email, name, '', now()]); }
        if (!(await tx.one('SELECT 1 AS x FROM memberships WHERE org_id = ? AND user_id = ?', [inv.org_id, u!.id])))
          await tx.run('INSERT INTO memberships (org_id, user_id, role, visibility, title, created_at) VALUES (?, ?, ?, ?, ?, ?)', [inv.org_id, u!.id, inv.role, 'all', inv.role === 'sales' ? 'Handlowiec' : '', now()]);
        await tx.run('UPDATE invites SET accepted_at = ? WHERE id = ?', [now(), inv.id]);
        await tx.run('INSERT INTO identities (provider, subject, user_id, email, created_at) VALUES (?, ?, ?, ?, ?)', [p, sub, u!.id, email, now()]);
        await audit(tx, { orgId: inv.org_id, userId: u!.id }, 'invite_accepted', null, null, { email: inv.email, via: p });
      });
      return finish(reply, u!.id, inv.org_id);
    }
    if (verified) {
      const u = await db.one('SELECT id FROM users WHERE email = ?', [verified]);
      if (u) { await link(p, sub, u.id, email); return finish(reply, u.id); }
    } else if (email && await db.one('SELECT id FROM users WHERE email = ?', [email])) {
      return back(reply, 'oauth_error=link_first');
    }
    if (cfg.signup === 'closed') return back(reply, 'oauth_error=signup_closed');
    if (!email) return back(reply, 'oauth_error=no_email');
    return back(reply, 'oauth_signup=' + await putState({ kind: 'signup', p, sub, email, name }, 30));
  });

  /** Nowa firma po logowaniu Google lub Microsoft: brakuje tylko nazwy firmy. */
  app.get('/api/auth/oauth/pending/:t', async req => {
    const r = await db.one('SELECT data, expires_at FROM oauth_states WHERE id = ?', [sha256((req.params as any).t)]);
    const d = r && r.expires_at >= now() ? parseJson<Record<string, any>>(r.data, {}) : null;
    if (!d || d.kind !== 'signup') throw new HttpError(404, 'expired', 'Logowanie wygasło. Zacznij jeszcze raz.');
    return { email: d.email, name: d.name, provider: PROVIDER_LABEL[d.p as P] };
  });
  app.post('/api/auth/oauth/complete', async (req, reply) => {
    const b = (req.body || {}) as Record<string, unknown>;
    const company = String(b.company || '').trim().slice(0, 200), name = String(b.name || '').trim().slice(0, 200);
    if (!company) throw bad('company', 'Podaj nazwę firmy.');
    const d = await takeState(String(b.t || ''), 'signup');
    if (!d) throw new HttpError(404, 'expired', 'Logowanie wygasło. Zacznij jeszcze raz.');
    if (cfg.signup === 'closed') throw new HttpError(403, 'signup_closed', 'Rejestracja nowych firm jest wyłączona. Poproś o zaproszenie.');
    if (await db.one('SELECT id FROM users WHERE email = ?', [d.email])) throw new HttpError(409, 'email_taken', 'Konto z tym adresem już istnieje. Zaloguj się hasłem i połącz konto w Ustawieniach.');
    const uid = newId('u_'), oid = newId('o_'), t = now();
    await db.tx(async tx => {
      await tx.run('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [uid, d.email, name || d.name, '', t]);
      await tx.run('INSERT INTO orgs (id, name, settings, created_at) VALUES (?, ?, ?, ?)', [oid, company, JSON.stringify({ company }), t]);
      await tx.run('INSERT INTO memberships (org_id, user_id, role, visibility, title, created_at) VALUES (?, ?, ?, ?, ?, ?)', [oid, uid, 'admin', 'all', 'Founder', t]);
      await tx.run('INSERT INTO identities (provider, subject, user_id, email, created_at) VALUES (?, ?, ?, ?, ?)', [d.p, d.sub, uid, d.email, t]);
      await audit(tx, { orgId: oid, userId: uid }, 'org_created', null, null, { via: d.p });
    });
    await createSession(db, reply, cfg, uid, oid, newToken());
    return { ok: true };
  });
  app.post('/api/auth/oauth/totp', async (req, reply) => {
    const b = (req.body || {}) as Record<string, unknown>;
    const id = sha256(String(b.t || ''));
    const r = await db.one('SELECT data, expires_at FROM oauth_states WHERE id = ?', [id]);
    const d = r && r.expires_at >= now() ? parseJson<Record<string, any>>(r.data, {}) : null;
    if (!d || d.kind !== 'totp') throw new HttpError(404, 'expired', 'Logowanie wygasło. Zacznij jeszcze raz.');
    const u = await db.one('SELECT totp_secret FROM users WHERE id = ?', [d.userId]);
    if (!u || !verifyTotp(u.totp_secret, String(b.code || ''))) throw new HttpError(401, 'totp_invalid', 'Nieprawidłowy kod. Sprawdź czas w telefonie i spróbuj ponownie.');
    await db.run('DELETE FROM oauth_states WHERE id = ?', [id]);
    await createSession(db, reply, cfg, d.userId, d.orgId, newToken());
    await audit(db, { orgId: d.orgId, userId: d.userId }, 'login', null, null, { via: 'oauth' });
    return { ok: true };
  });

  /* połączone konta w Ustawieniach */
  app.get('/api/me/identities', async req => {
    const c = need(req);
    const u = await db.one('SELECT password_hash FROM users WHERE id = ?', [c.user.id]);
    const list = providers(cfg);
    return {
      identities: (await db.all('SELECT provider, email, created_at FROM identities WHERE user_id = ? ORDER BY created_at', [c.user.id])),
      hasPassword: !!u?.password_hash, available: { google: !!list.google, microsoft: !!list.microsoft }
    };
  });
  app.delete('/api/me/identities/:p', async req => {
    const c = need(req);
    const u = await db.one('SELECT password_hash FROM users WHERE id = ?', [c.user.id]);
    const n = Number((await db.one('SELECT COUNT(*) AS n FROM identities WHERE user_id = ?', [c.user.id]))?.n || 0);
    if (!u?.password_hash && n <= 1) throw bad('last_login', 'To jedyny sposób logowania. Najpierw ustaw hasło.');
    await db.run('DELETE FROM identities WHERE user_id = ? AND provider = ?', [c.user.id, (req.params as any).p]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'identity_unlinked', null, null, { provider: (req.params as any).p });
    return { ok: true };
  });
}
