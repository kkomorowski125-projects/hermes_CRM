// Dane CRM: pełny stan, synchronizacja zmian z przeglądarki, zmiany od innych osób, eksport, import i RODO.
import type { FastifyInstance } from 'fastify';
import type { Db } from './db.js';
import { HttpError, bad, need, audit, parseJson, type Ctx } from './context.js';
import { now } from './security.js';

export const TYPES = ['company', 'contact', 'lead', 'deal', 'activity'] as const;
type RType = typeof TYPES[number];
/** Ustawienia całej firmy, które zmienia administrator; reszta to preferencje osoby */
const ORG_KEYS = ['target', 'targetSet', 'company', 'stages', 'labels', 'custom', 'meTargets'];
const PREF_KEYS = ['aLayout', 'onboardingHidden'];

type Rec = { type: RType; id: string; data: Record<string, any>; deleted: boolean; updated_at: string };

async function loadAll(db: Db, orgId: string, since?: string): Promise<Rec[]> {
  const rows = since
    ? await db.all('SELECT type, id, data, deleted, updated_at FROM records WHERE org_id = ? AND updated_at >= ? ORDER BY updated_at', [orgId, since])
    : await db.all('SELECT type, id, data, deleted, updated_at FROM records WHERE org_id = ? AND deleted = 0', [orgId]);
  return rows.map(r => ({ type: r.type, id: r.id, data: parseJson(r.data, {}), deleted: !!Number(r.deleted), updated_at: r.updated_at }));
}
/** Widoczność „tylko moje”: leady i szanse innych opiekunów oraz ich historia są ukryte. */
function visibleFilter(c: Ctx, all: Rec[]) {
  if (c.visibility !== 'own' || c.role === 'admin') return all;
  const hidden = new Set(all.filter(r => (r.type === 'lead' || r.type === 'deal') && r.data.owner && r.data.owner !== c.user.name).map(r => `${r.type}:${r.id}`));
  return all.filter(r => !hidden.has(`${r.type}:${r.id}`) && !(r.type === 'activity' && hidden.has(`${r.data.obj}:${r.data.rid}`)));
}
const group = (recs: Rec[]) => {
  const db: Record<string, any[]> = { company: [], contact: [], lead: [], deal: [], activity: [] };
  for (const r of recs) if (!r.deleted) db[r.type].push(r.data);
  db.activity.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return db;
};
const cursorOf = (recs: Rec[], fallback: string) => recs.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), fallback);

function settingsFor(c: Ctx) {
  const s = c.org.settings as Record<string, any>;
  return { ...s, company: c.org.name, userName: c.user.name, ...Object.fromEntries(PREF_KEYS.filter(k => k in c.user.prefs).map(k => [k, c.user.prefs[k]])) };
}

export default async function dataRoutes(app: FastifyInstance) {
  const { db } = app;

  app.get('/api/state', async req => {
    const c = need(req);
    const t = now();
    const all = visibleFilter(c, await loadAll(db, c.org.id));
    return { db: group(all), settings: settingsFor(c), cursor: cursorOf(all, t) };
  });

  app.get('/api/changes', async req => {
    const c = need(req);
    const since = String((req.query as any).since || '');
    if (!since) throw bad('since', 'Brak parametru since.');
    const t = now();
    const changed = visibleFilter(c, await loadAll(db, c.org.id, since));
    return {
      changes: changed.map(r => ({ type: r.type, id: r.id, data: r.deleted ? null : r.data })),
      settings: settingsFor(c), cursor: cursorOf(changed, since > t ? since : t)
    };
  });

  app.post('/api/sync', async req => {
    const c = need(req);
    if (c.role === 'viewer') throw new HttpError(403, 'read_only', 'Masz dostęp tylko do podglądu.');
    const b = (req.body || {}) as { upserts?: any[]; deletes?: any[]; settings?: Record<string, unknown>; prefs?: Record<string, unknown> };
    const ups = Array.isArray(b.upserts) ? b.upserts : [], dels = Array.isArray(b.deletes) ? b.deletes : [];
    if (ups.length + dels.length > 5000) throw bad('too_large', 'Za dużo zmian naraz.');
    const rejected: { type: string; id: string; reason: string }[] = [];
    const t = now();
    const own = c.visibility === 'own' && c.role !== 'admin';
    await db.tx(async tx => {
      const existing = async (type: string, id: string) => tx.one('SELECT data, owner, deleted FROM records WHERE org_id = ? AND type = ? AND id = ?', [c.org.id, type, id]);
      const parentHidden = async (obj: string, rid: string) => {
        if (!own || (obj !== 'lead' && obj !== 'deal')) return false;
        const p = await existing(obj, rid);
        return !!(p && p.owner && p.owner !== c.user.name);
      };
      for (const u of ups) {
        const type = String(u?.type), id = String(u?.id || ''), data = u?.data;
        if (!TYPES.includes(type as RType) || !id || id.length > 80 || !data || typeof data !== 'object' || data.id !== id) { rejected.push({ type, id, reason: 'invalid' }); continue; }
        const prev = await existing(type, id);
        if (own && (type === 'lead' || type === 'deal') && ((prev && prev.owner && prev.owner !== c.user.name) || (data.owner && data.owner !== c.user.name))) { rejected.push({ type, id, reason: 'not_owner' }); continue; }
        if (type === 'activity' && await parentHidden(data.obj, data.rid)) { rejected.push({ type, id, reason: 'not_owner' }); continue; }
        const json = JSON.stringify(data);
        const owner = type === 'lead' || type === 'deal' ? (data.owner || null) : null;
        if (prev) await tx.run('UPDATE records SET data = ?, owner = ?, updated_at = ?, updated_by = ?, deleted = 0 WHERE org_id = ? AND type = ? AND id = ?', [json, owner, t, c.user.id, c.org.id, type, id]);
        else await tx.run('INSERT INTO records (org_id, type, id, data, owner, updated_at, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [c.org.id, type, id, json, owner, t, c.user.id]);
        if (type !== 'activity') await audit(tx, { orgId: c.org.id, userId: c.user.id }, prev && !Number(prev.deleted) ? 'record_updated' : 'record_created', type, id, { name: data.name });
      }
      for (const d of dels) {
        const type = String(d?.type), id = String(d?.id || '');
        const prev = TYPES.includes(type as RType) ? await existing(type, id) : undefined;
        if (!prev) continue;
        if (own && (type === 'lead' || type === 'deal') && prev.owner && prev.owner !== c.user.name) { rejected.push({ type, id, reason: 'not_owner' }); continue; }
        await tx.run('UPDATE records SET deleted = 1, updated_at = ?, updated_by = ? WHERE org_id = ? AND type = ? AND id = ?', [t, c.user.id, c.org.id, type, id]);
        if (type !== 'activity') await audit(tx, { orgId: c.org.id, userId: c.user.id }, 'record_deleted', type, id, { name: parseJson<any>(prev.data, {}).name });
      }
      if (b.settings && typeof b.settings === 'object' && c.role === 'admin') {
        const next = { ...c.org.settings, ...Object.fromEntries(ORG_KEYS.filter(k => k in b.settings!).map(k => [k, b.settings![k]])) } as Record<string, any>;
        const name = typeof next.company === 'string' && next.company.trim() ? next.company.trim().slice(0, 200) : c.org.name;
        await tx.run('UPDATE orgs SET settings = ?, name = ? WHERE id = ?', [JSON.stringify(next), name, c.org.id]);
      }
      if (b.prefs && typeof b.prefs === 'object') {
        const p = { ...c.user.prefs, ...Object.fromEntries(PREF_KEYS.filter(k => k in b.prefs!).map(k => [k, b.prefs![k]])) };
        await tx.run('UPDATE users SET prefs = ? WHERE id = ?', [JSON.stringify(p), c.user.id]);
      }
    });
    return { ok: true, rejected, cursor: t };
  });

  /** Kopia zapasowa w formacie prototypu (Ustawienia → Pobierz kopię działa tak samo). */
  app.get('/api/export', async req => {
    const c = need(req, 'admin');
    const all = await loadAll(db, c.org.id);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'export');
    const s = c.org.settings as Record<string, any>;
    return { app: 'hermes-crm', v: 3, savedAt: now(), db: group(all), settings: settingsFor(c), labels: s.labels || {}, custom: s.custom || {} };
  });

  /** Import kopii z prototypu: dodaje i nadpisuje rekordy o tych samych identyfikatorach. */
  app.post('/api/import', { bodyLimit: 50 * 1024 * 1024 }, async req => {
    const c = need(req, 'admin');
    const s = (req.body || {}) as any;
    if (s.app !== 'hermes-crm' || !s.db) throw bad('format', 'To nie jest kopia Hermesa.');
    const t = now(); let n = 0;
    await db.tx(async tx => {
      for (const type of TYPES) for (const data of (Array.isArray(s.db[type]) ? s.db[type] : [])) {
        if (!data?.id) continue;
        const owner = type === 'lead' || type === 'deal' ? (data.owner || null) : null;
        const exists = await tx.one('SELECT 1 AS x FROM records WHERE org_id = ? AND type = ? AND id = ?', [c.org.id, type, String(data.id)]);
        if (exists) await tx.run('UPDATE records SET data = ?, owner = ?, updated_at = ?, updated_by = ?, deleted = 0 WHERE org_id = ? AND type = ? AND id = ?', [JSON.stringify(data), owner, t, c.user.id, c.org.id, type, String(data.id)]);
        else await tx.run('INSERT INTO records (org_id, type, id, data, owner, updated_at, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [c.org.id, type, String(data.id), JSON.stringify(data), owner, t, c.user.id]);
        n++;
      }
      const keep = ['target', 'targetSet', 'stages'];
      const next = { ...c.org.settings, ...Object.fromEntries(keep.filter(k => s.settings && k in s.settings).map(k => [k, s.settings[k]])), labels: s.labels || {}, custom: s.custom || {} };
      await tx.run('UPDATE orgs SET settings = ? WHERE id = ?', [JSON.stringify(next), c.org.id]);
      await audit(tx, { orgId: c.org.id, userId: c.user.id }, 'import', null, null, { records: n });
    });
    return { ok: true, records: n };
  });

  /* RODO: dane jednej osoby (art. 15 i 20) i ich usunięcie (art. 17) */
  app.get('/api/gdpr/contacts/:id', async req => {
    const c = need(req, 'admin');
    const id = (req.params as any).id as string;
    const all = await loadAll(db, c.org.id);
    const person = all.find(r => r.type === 'contact' && r.id === id);
    if (!person) throw new HttpError(404, 'not_found', 'Nie ma takiego kontaktu.');
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'gdpr_export', 'contact', id);
    return {
      exportedAt: now(), contact: person.data,
      company: all.find(r => r.type === 'company' && r.id === person.data.company)?.data?.name || null,
      leads: all.filter(r => r.type === 'lead' && (r.data.contacts || []).includes(id)).map(r => ({ name: r.data.name, status: r.data.status, created: r.data.created })),
      deals: all.filter(r => r.type === 'deal' && (r.data.contacts || []).includes(id)).map(r => ({ name: r.data.name, stage: r.data.stage, created: r.data.created })),
      activity: all.filter(r => r.type === 'activity' && ((r.data.obj === 'contact' && r.data.rid === id) || r.data.who === id)).map(r => r.data)
    };
  });
  app.delete('/api/gdpr/contacts/:id', async req => {
    const c = need(req, 'admin');
    const id = (req.params as any).id as string;
    const all = await loadAll(db, c.org.id);
    const person = all.find(r => r.type === 'contact' && r.id === id);
    if (!person) throw new HttpError(404, 'not_found', 'Nie ma takiego kontaktu.');
    const t = now();
    let acts = 0, links = 0;
    await db.tx(async tx => {
      await tx.run("UPDATE records SET data = ?, deleted = 1, updated_at = ?, updated_by = ? WHERE org_id = ? AND type = 'contact' AND id = ?", [JSON.stringify({ id, erased: true }), t, c.user.id, c.org.id, id]);
      for (const r of all) {
        if (r.type === 'activity' && r.data.obj === 'contact' && r.data.rid === id) {
          await tx.run("UPDATE records SET data = ?, deleted = 1, updated_at = ? WHERE org_id = ? AND type = 'activity' AND id = ?", [JSON.stringify({ id: r.id, erased: true }), t, c.org.id, r.id]); acts++;
        } else if (r.type === 'activity' && r.data.who === id) {
          const d = { ...r.data }; delete d.who;
          await tx.run("UPDATE records SET data = ?, updated_at = ? WHERE org_id = ? AND type = 'activity' AND id = ?", [JSON.stringify(d), t, c.org.id, r.id]);
        } else if ((r.type === 'lead' || r.type === 'deal') && (r.data.contacts || []).includes(id)) {
          const d = { ...r.data, contacts: r.data.contacts.filter((x: string) => x !== id) };
          await tx.run('UPDATE records SET data = ?, updated_at = ? WHERE org_id = ? AND type = ? AND id = ?', [JSON.stringify(d), t, c.org.id, r.type, r.id]); links++;
        }
      }
      await audit(tx, { orgId: c.org.id, userId: c.user.id }, 'gdpr_erase', 'contact', id, { activities: acts, links });
    });
    return { ok: true, activities: acts, links };
  });
}
