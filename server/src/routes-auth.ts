// Konta: rejestracja firmy, logowanie z 2FA, wylogowanie, reset i zmiana hasła, zaproszenia, profil.
import type { FastifyInstance } from 'fastify';
import { COOKIE, HttpError, bad, createSession, need, audit, members, ROLE_LABEL, type Role } from './context.js';
import { layout } from './mail.js';
import { hashPassword, verifyPassword, passwordProblem, newId, newToken, now, sha256, inHours, inDays, newTotpSecret, verifyTotp, totpUri, limiter } from './security.js';

const emailOk = (e: unknown) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && e.length <= 200;
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function authRoutes(app: FastifyInstance) {
  const { db, cfg } = app;
  const loginLimit = limiter(10, 15 * 60e3);

  app.get('/api/session', async req => {
    const c = need(req);
    const orgs = await db.all('SELECT o.id, o.name, m.role FROM memberships m JOIN orgs o ON o.id = m.org_id WHERE m.user_id = ? ORDER BY o.name', [c.user.id]);
    const me = (await db.one('SELECT title, target FROM memberships WHERE org_id = ? AND user_id = ?', [c.org.id, c.user.id]))!;
    return {
      user: { id: c.user.id, email: c.user.email, name: c.user.name, totp: c.user.totp_enabled, prefs: c.user.prefs, title: me.title, target: me.target == null ? null : Number(me.target) },
      org: { id: c.org.id, name: c.org.name }, role: c.role, roleLabel: ROLE_LABEL[c.role], visibility: c.visibility,
      members: await members(db, c.org.id), orgs,
      ai: { enabled: !!cfg.anthropicKey, model: cfg.anthropicModel }
    };
  });

  app.post('/api/auth/register', async (req, reply) => {
    if (cfg.signup === 'closed') throw new HttpError(403, 'signup_closed', 'Rejestracja nowych firm jest wyłączona. Poproś o zaproszenie.');
    const b = (req.body || {}) as Record<string, unknown>;
    const name = str(b.name), company = str(b.company), email = str(b.email).toLowerCase(), password = String(b.password || '');
    if (!name) throw bad('name', 'Podaj imię i nazwisko.');
    if (!company) throw bad('company', 'Podaj nazwę firmy.');
    if (!emailOk(email)) throw bad('email', 'Podaj poprawny adres email.');
    const pp = passwordProblem(password); if (pp) throw bad('password', pp);
    if (await db.one('SELECT id FROM users WHERE email = ?', [email])) throw new HttpError(409, 'email_taken', 'Konto z tym adresem już istnieje. Zaloguj się.');
    const uid = newId('u_'), oid = newId('o_'), t = now();
    await db.tx(async tx => {
      await tx.run('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [uid, email, name, hashPassword(password), t]);
      await tx.run('INSERT INTO orgs (id, name, settings, created_at) VALUES (?, ?, ?, ?)', [oid, company, JSON.stringify({ company }), t]);
      await tx.run('INSERT INTO memberships (org_id, user_id, role, visibility, title, created_at) VALUES (?, ?, ?, ?, ?, ?)', [oid, uid, 'admin', 'all', 'Founder', t]);
      await audit(tx, { orgId: oid, userId: uid }, 'org_created');
    });
    await createSession(db, reply, cfg, uid, oid, newToken());
    return { ok: true };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const b = (req.body || {}) as Record<string, unknown>;
    const email = str(b.email).toLowerCase(), password = String(b.password || '');
    if (!loginLimit(email + '|' + req.ip)) throw new HttpError(429, 'too_many', 'Za dużo prób logowania. Spróbuj za 15 minut.');
    const u = await db.one('SELECT * FROM users WHERE email = ?', [email]);
    if (!u || !verifyPassword(password, u.password_hash)) throw new HttpError(401, 'bad_credentials', 'Nieprawidłowy email lub hasło.');
    if (Number(u.totp_enabled)) {
      if (!b.code) throw new HttpError(401, 'totp_required', 'Podaj kod z aplikacji uwierzytelniającej.');
      if (!verifyTotp(u.totp_secret, String(b.code))) throw new HttpError(401, 'totp_invalid', 'Nieprawidłowy kod. Sprawdź czas w telefonie i spróbuj ponownie.');
    }
    const m = b.orgId
      ? await db.one('SELECT org_id FROM memberships WHERE user_id = ? AND org_id = ?', [u.id, String(b.orgId)])
      : await db.one('SELECT org_id FROM memberships WHERE user_id = ? ORDER BY created_at LIMIT 1', [u.id]);
    if (!m) throw new HttpError(403, 'no_org', 'To konto nie należy do żadnej firmy.');
    await createSession(db, reply, cfg, u.id, m.org_id, newToken());
    await audit(db, { orgId: m.org_id, userId: u.id }, 'login');
    return { ok: true };
  });

  app.post('/api/auth/switch-org', async (req, reply) => {
    const c = need(req);
    const orgId = String(((req.body || {}) as Record<string, unknown>).orgId || '');
    if (!(await db.one('SELECT 1 AS x FROM memberships WHERE user_id = ? AND org_id = ?', [c.user.id, orgId]))) throw new HttpError(403, 'forbidden', 'Nie należysz do tej firmy.');
    await db.run('DELETE FROM sessions WHERE id = ?', [c.sessionId]);
    await createSession(db, reply, cfg, c.user.id, orgId, newToken());
    return { ok: true };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    if (req.ctx) await db.run('DELETE FROM sessions WHERE id = ?', [req.ctx.sessionId]);
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  /* reset hasła: link ważny 2 godziny; bez wysyłki maili link wraca w odpowiedzi w trybie deweloperskim */
  app.post('/api/auth/reset/request', async req => {
    const email = str(((req.body || {}) as Record<string, unknown>).email).toLowerCase();
    const u = await db.one('SELECT id FROM users WHERE email = ?', [email]);
    let link: string | undefined;
    if (u) {
      const token = newToken();
      await db.run('INSERT INTO password_resets (id, user_id, expires_at) VALUES (?, ?, ?)', [sha256(token), u.id, inHours(2)]);
      link = `${cfg.publicUrl}/?reset=${token}`;
      app.log.info({ email, link: cfg.dev ? link : undefined }, 'Link do resetu hasła');
      await app.mail.send({ to: email, subject: 'Ustaw nowe hasło w Hermes CRM', ...layout(['Otrzymaliśmy prośbę o zmianę hasła do Twojego konta w Hermes CRM.', 'Link jest ważny 2 godziny i działa tylko raz. Jeśli to nie Ty, zignoruj tę wiadomość: hasło się nie zmieni.'], { label: 'Ustaw nowe hasło', url: link }) });
    }
    return { ok: true, mail: app.mail.enabled, ...(cfg.dev ? { link } : {}) };
  });
  app.post('/api/auth/reset/confirm', async req => {
    const b = (req.body || {}) as Record<string, unknown>;
    const r = await db.one('SELECT * FROM password_resets WHERE id = ?', [sha256(String(b.token || ''))]);
    if (!r || r.used_at || r.expires_at < now()) throw bad('token', 'Link wygasł albo został już użyty. Poproś o nowy.');
    const pp = passwordProblem(String(b.password || '')); if (pp) throw bad('password', pp);
    await db.tx(async tx => {
      await tx.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(String(b.password)), r.user_id]);
      await tx.run('UPDATE password_resets SET used_at = ? WHERE id = ?', [now(), r.id]);
      await tx.run('DELETE FROM sessions WHERE user_id = ?', [r.user_id]);
    });
    return { ok: true };
  });
  app.post('/api/auth/password', async req => {
    const c = need(req);
    const b = (req.body || {}) as Record<string, unknown>;
    const u = (await db.one('SELECT password_hash FROM users WHERE id = ?', [c.user.id]))!;
    if (u.password_hash && !verifyPassword(String(b.current || ''), u.password_hash)) throw bad('current', 'Obecne hasło jest nieprawidłowe.');
    const pp = passwordProblem(String(b.next || '')); if (pp) throw bad('next', pp);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(String(b.next)), c.user.id]);
    await db.run('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [c.user.id, c.sessionId]);
    return { ok: true };
  });

  /* 2FA */
  app.post('/api/auth/2fa/setup', async req => {
    const c = need(req);
    if (c.user.totp_enabled) throw bad('enabled', 'Weryfikacja dwuetapowa jest już włączona.');
    const secret = newTotpSecret();
    await db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, c.user.id]);
    return { secret, uri: totpUri(secret, c.user.email) };
  });
  app.post('/api/auth/2fa/enable', async req => {
    const c = need(req);
    const u = (await db.one('SELECT totp_secret FROM users WHERE id = ?', [c.user.id]))!;
    if (!u.totp_secret || !verifyTotp(u.totp_secret, String(((req.body || {}) as Record<string, unknown>).code || ''))) throw bad('code', 'Nieprawidłowy kod.');
    await db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [c.user.id]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, '2fa_enabled');
    return { ok: true };
  });
  app.post('/api/auth/2fa/disable', async req => {
    const c = need(req);
    const u = (await db.one('SELECT password_hash FROM users WHERE id = ?', [c.user.id]))!;
    if (!verifyPassword(String(((req.body || {}) as Record<string, unknown>).password || ''), u.password_hash)) throw bad('password', 'Nieprawidłowe hasło.');
    await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [c.user.id]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, '2fa_disabled');
    return { ok: true };
  });

  /* profil */
  app.patch('/api/me', async req => {
    const c = need(req);
    const b = (req.body || {}) as Record<string, unknown>;
    if (b.name !== undefined) {
      const name = str(b.name); if (!name) throw bad('name', 'Podaj imię i nazwisko.');
      await db.run('UPDATE users SET name = ? WHERE id = ?', [name, c.user.id]);
    }
    if (b.prefs && typeof b.prefs === 'object') await db.run('UPDATE users SET prefs = ? WHERE id = ?', [JSON.stringify({ ...c.user.prefs, ...(b.prefs as object) }), c.user.id]);
    return { ok: true };
  });

  /* zaproszenia: podgląd i przyjęcie */
  app.get('/api/invites/:token', async req => {
    const inv = await db.one('SELECT i.*, o.name AS org_name FROM invites i JOIN orgs o ON o.id = i.org_id WHERE i.id = ?', [sha256((req.params as any).token)]);
    if (!inv || inv.accepted_at || inv.expires_at < now()) throw new HttpError(404, 'invite_invalid', 'Zaproszenie wygasło albo zostało już użyte.');
    const exists = !!(await db.one('SELECT id FROM users WHERE email = ?', [inv.email]));
    return { org: inv.org_name, email: inv.email, role: inv.role, roleLabel: ROLE_LABEL[inv.role as Role], existingUser: exists };
  });
  app.post('/api/invites/:token/accept', async (req, reply) => {
    const inv = await db.one('SELECT * FROM invites WHERE id = ?', [sha256((req.params as any).token)]);
    if (!inv || inv.accepted_at || inv.expires_at < now()) throw new HttpError(404, 'invite_invalid', 'Zaproszenie wygasło albo zostało już użyte.');
    const b = (req.body || {}) as Record<string, unknown>;
    let u = await db.one('SELECT * FROM users WHERE email = ?', [inv.email]);
    await db.tx(async tx => {
      if (u) {
        if (!verifyPassword(String(b.password || ''), u.password_hash)) throw new HttpError(401, 'bad_credentials', 'Nieprawidłowe hasło do istniejącego konta.');
      } else {
        const name = str(b.name); if (!name) throw bad('name', 'Podaj imię i nazwisko.');
        const pp = passwordProblem(String(b.password || '')); if (pp) throw bad('password', pp);
        u = { id: newId('u_') };
        await tx.run('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [u.id, inv.email, name, hashPassword(String(b.password)), now()]);
      }
      if (!(await tx.one('SELECT 1 AS x FROM memberships WHERE org_id = ? AND user_id = ?', [inv.org_id, u!.id])))
        await tx.run('INSERT INTO memberships (org_id, user_id, role, visibility, title, created_at) VALUES (?, ?, ?, ?, ?, ?)', [inv.org_id, u!.id, inv.role, 'all', inv.role === 'sales' ? 'Handlowiec' : '', now()]);
      await tx.run('UPDATE invites SET accepted_at = ? WHERE id = ?', [now(), inv.id]);
      await audit(tx, { orgId: inv.org_id, userId: u!.id }, 'invite_accepted', null, null, { email: inv.email });
    });
    await createSession(db, reply, cfg, u!.id, inv.org_id, newToken());
    return { ok: true };
  });
  void inDays;
}
