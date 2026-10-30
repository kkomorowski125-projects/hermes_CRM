// Zespół i firma: członkowie, role, widoczność, cele, zaproszenia, ustawienia firmy, dziennik zmian.
import type { FastifyInstance } from 'fastify';
import { layout } from './mail.js';
import { HttpError, bad, need, audit, members, ROLES, ROLE_LABEL, parseJson, type Role } from './context.js';
import { newToken, sha256, now, inDays, inHours } from './security.js';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function orgRoutes(app: FastifyInstance) {
  const { db, cfg } = app;
  const adminsLeft = async (orgId: string, except: string) =>
    Number((await db.one("SELECT COUNT(*) AS n FROM memberships WHERE org_id = ? AND role = 'admin' AND user_id <> ?", [orgId, except]))!.n);

  app.get('/api/org/members', async req => ({ members: await members(db, need(req).org.id) }));

  app.patch('/api/org/members/:id', async req => {
    const c = need(req, 'admin');
    const id = (req.params as any).id as string, b = (req.body || {}) as Record<string, unknown>;
    const m = await db.one('SELECT * FROM memberships WHERE org_id = ? AND user_id = ?', [c.org.id, id]);
    if (!m) throw new HttpError(404, 'not_found', 'Nie ma takiej osoby w zespole.');
    const role = b.role === undefined ? m.role : String(b.role);
    if (!ROLES.includes(role as Role)) throw bad('role', 'Nieznana rola.');
    if (m.role === 'admin' && role !== 'admin' && !(await adminsLeft(c.org.id, id))) throw bad('last_admin', 'Firma musi mieć co najmniej jednego administratora.');
    const visibility = b.visibility === undefined ? m.visibility : (b.visibility === 'own' ? 'own' : 'all');
    const title = b.title === undefined ? m.title : str(b.title, 80);
    const target = b.target === undefined ? m.target : (Number(b.target) > 0 ? Math.round(Number(b.target)) : null);
    await db.run('UPDATE memberships SET role = ?, visibility = ?, title = ?, target = ? WHERE org_id = ? AND user_id = ?', [role, visibility, title, target, c.org.id, id]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'member_updated', 'user', id, { role, visibility, title, target });
    return { members: await members(db, c.org.id) };
  });

  /** Usunięcie z zespołu przekazuje leady i szanse tej osoby administratorowi, który ją usuwa. */
  app.delete('/api/org/members/:id', async req => {
    const c = need(req, 'admin');
    const id = (req.params as any).id as string;
    if (id === c.user.id) throw bad('self', 'Nie możesz usunąć siebie. Poproś innego administratora.');
    const u = await db.one('SELECT u.name, m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND m.user_id = ?', [c.org.id, id]);
    if (!u) throw new HttpError(404, 'not_found', 'Nie ma takiej osoby w zespole.');
    let moved = 0;
    await db.tx(async tx => {
      const recs = await tx.all("SELECT type, id, data FROM records WHERE org_id = ? AND owner = ? AND type IN ('lead', 'deal')", [c.org.id, u.name]);
      for (const r of recs) {
        const d = parseJson<Record<string, unknown>>(r.data, {}); d.owner = c.user.name;
        await tx.run('UPDATE records SET data = ?, owner = ?, updated_at = ?, updated_by = ? WHERE org_id = ? AND type = ? AND id = ?', [JSON.stringify(d), c.user.name, now(), c.user.id, c.org.id, r.type, r.id]);
        moved++;
      }
      await tx.run('DELETE FROM memberships WHERE org_id = ? AND user_id = ?', [c.org.id, id]);
      await tx.run('DELETE FROM sessions WHERE org_id = ? AND user_id = ?', [c.org.id, id]);
      await audit(tx, { orgId: c.org.id, userId: c.user.id }, 'member_removed', 'user', id, { name: u.name, moved });
    });
    return { moved, members: await members(db, c.org.id) };
  });

  app.post('/api/org/members/:id/reset', async req => {
    const c = need(req, 'admin');
    const id = (req.params as any).id as string;
    const u = await db.one('SELECT u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND m.user_id = ?', [c.org.id, id]);
    if (!u) throw new HttpError(404, 'not_found', 'Nie ma takiej osoby w zespole.');
    const token = newToken();
    await db.run('INSERT INTO password_resets (id, user_id, expires_at) VALUES (?, ?, ?)', [sha256(token), id, inHours(24)]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'reset_link_created', 'user', id);
    const link = `${cfg.publicUrl}/?reset=${token}`;
    const sent = await app.mail.send({ to: u.email, subject: 'Ustaw nowe hasło w Hermes CRM', ...layout([`Administrator firmy ${c.org.name} przygotował dla Ciebie link do ustawienia nowego hasła.`, 'Link jest ważny 24 godziny i działa tylko raz.'], { label: 'Ustaw nowe hasło', url: link }) });
    return { link, sent };
  });

  /* zaproszenia: link ważny 7 dni, wysyłany mailem i do skopiowania */
  app.get('/api/org/invites', async req => {
    const c = need(req, 'admin');
    return { invites: await db.all('SELECT id, email, role, expires_at, created_at FROM invites WHERE org_id = ? AND accepted_at IS NULL AND expires_at > ? ORDER BY created_at DESC', [c.org.id, now()]) };
  });
  app.post('/api/org/invites', async req => {
    const c = need(req, 'admin');
    const b = (req.body || {}) as Record<string, unknown>;
    const email = str(b.email).toLowerCase(), role = String(b.role || 'sales');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('email', 'Podaj poprawny adres email.');
    if (!ROLES.includes(role as Role)) throw bad('role', 'Nieznana rola.');
    if (await db.one('SELECT 1 AS x FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND u.email = ?', [c.org.id, email])) throw new HttpError(409, 'member_exists', 'Ta osoba jest już w zespole.');
    const token = newToken();
    await db.run('INSERT INTO invites (id, org_id, email, role, invited_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [sha256(token), c.org.id, email, role, c.user.id, inDays(7), now()]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'invite_created', null, null, { email, role });
    const link = `${cfg.publicUrl}/?invite=${token}`;
    app.log.info({ email, link: cfg.dev ? link : undefined }, 'Zaproszenie do zespołu');
    const m = layout([`${c.user.name} zaprasza Cię do zespołu firmy ${c.org.name} w Hermes CRM.`, `Rola: ${ROLE_LABEL[role as Role]}. Zaproszenie jest ważne 7 dni.`], { label: 'Dołącz do zespołu', url: link });
    const sent = await app.mail.send({ to: email, subject: `Zaproszenie do ${c.org.name} w Hermes CRM`, ...m });
    return { link, sent };
  });
  app.delete('/api/org/invites/:id', async req => {
    const c = need(req, 'admin');
    await db.run('DELETE FROM invites WHERE org_id = ? AND id = ?', [c.org.id, (req.params as any).id]);
    return { ok: true };
  });

  app.patch('/api/org', async req => {
    const c = need(req, 'admin');
    const name = str(((req.body || {}) as Record<string, unknown>).name);
    if (!name) throw bad('name', 'Podaj nazwę firmy.');
    await db.run('UPDATE orgs SET name = ?, settings = ? WHERE id = ?', [name, JSON.stringify({ ...c.org.settings, company: name }), c.org.id]);
    return { ok: true };
  });

  app.get('/api/audit', async req => {
    const c = need(req, 'admin');
    const limit = Math.min(500, Number((req.query as any).limit) || 100);
    const rows = await db.all(`SELECT a.action, a.type, a.record_id, a.detail, a.at, u.name AS user_name FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id WHERE a.org_id = ? ORDER BY a.at DESC LIMIT ${limit}`, [c.org.id]);
    return { entries: rows.map(r => ({ ...r, detail: parseJson(r.detail, null) })) };
  });
}
