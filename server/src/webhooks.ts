// Webhooki wychodzące dla Zapiera, Make i własnych systemów: zdarzenia z leadów i szans, podpis HMAC SHA 256.
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Db } from './db.js';
import { HttpError, bad, need, audit, parseJson } from './context.js';
import { newId, newToken, now } from './security.js';

export const EVENTS: Record<string, string> = {
  'lead.created': 'Nowy lead',
  'lead.status_changed': 'Zmiana statusu leada',
  'deal.created': 'Nowa szansa',
  'deal.stage_changed': 'Zmiana etapu szansy',
  'deal.won': 'Szansa wygrana',
  'deal.lost': 'Szansa przegrana',
  'offer.accepted': 'Oferta zaakceptowana'
};
export type HookEvent = { event: string; data: Record<string, unknown>; previous?: Record<string, unknown> };

/** Zdarzenia z porównania poprzedniej i nowej wersji rekordu. */
export function eventsFor(type: string, prev: any, next: any): HookEvent[] {
  if (type === 'lead') {
    if (!prev) return [{ event: 'lead.created', data: next }];
    if (prev.status !== next.status) return [{ event: 'lead.status_changed', data: next, previous: { status: prev.status } }];
  }
  if (type === 'deal') {
    if (!prev) return [{ event: 'deal.created', data: next }, ...(next.stage === 'Wygrana' ? [{ event: 'deal.won', data: next }] : [])];
    if (prev.stage !== next.stage) {
      const out: HookEvent[] = [{ event: 'deal.stage_changed', data: next, previous: { stage: prev.stage } }];
      if (next.stage === 'Wygrana') out.push({ event: 'deal.won', data: next });
      if (next.stage === 'Przegrana') out.push({ event: 'deal.lost', data: next });
      return out;
    }
  }
  return [];
}
export const sign = (secret: string, body: string) => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

/** Wysyła zdarzenia w tle: firma i osoby kontaktowe jako nazwy, jedna ponowna próba, wynik zapisany przy webhooku. */
export async function dispatch(app: FastifyInstance, orgId: string, events: HookEvent[]) {
  if (!events.length) return;
  const db: Db = app.db;
  const hooks = await db.all('SELECT id, url, events, secret FROM webhooks WHERE org_id = ?', [orgId]);
  if (!hooks.length) return;
  const org = await db.one('SELECT name FROM orgs WHERE id = ?', [orgId]);
  const recs = (await db.all("SELECT type, id, data FROM records WHERE org_id = ? AND deleted = 0 AND type IN ('company', 'contact')", [orgId])).map(r => ({ type: r.type, id: r.id, d: parseJson<any>(r.data, {}) }));
  const name = (type: string, id: unknown) => recs.find(r => r.type === type && r.id === id)?.d;
  for (const e of events) {
    const d = e.data as any;
    const payload = { event: e.event, label: EVENTS[e.event], at: now(), org: { id: orgId, name: org?.name },
      data: { ...d, company_name: name('company', d.company)?.name || '', contacts_detail: (d.contacts || []).map((id: string) => { const c = name('contact', id); return c ? { name: c.name, email: c.email || '', phone: c.phone || '' } : null; }).filter(Boolean) },
      ...(e.previous ? { previous: e.previous } : {}) };
    const body = JSON.stringify(payload);
    for (const h of hooks.filter(h => parseJson<string[]>(h.events, []).includes(e.event))) {
      void (async () => {
        let status = 0;
        for (let attempt = 0; attempt < 2 && !(status >= 200 && status < 300); attempt++) {
          try {
            const r = await fetch(h.url, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'HermesCRM-Webhook/1', 'x-hermes-event': e.event, 'x-hermes-signature': sign(h.secret, body) }, body, signal: AbortSignal.timeout(8000) });
            status = r.status;
          } catch { status = 0; }
          if (!(status >= 200 && status < 300) && attempt === 0) await new Promise(r => setTimeout(r, 1500));
        }
        await db.run('UPDATE webhooks SET last_status = ?, last_at = ? WHERE id = ?', [status, now(), h.id]).catch(() => {});
        if (!(status >= 200 && status < 300)) app.log.warn({ hook: h.id, event: e.event, status }, 'Webhook nie przyjął zdarzenia');
      })();
    }
  }
}

export default async function webhookRoutes(app: FastifyInstance) {
  const { db } = app;
  app.get('/api/org/webhooks', async req => {
    const c = need(req, 'admin');
    const rows = await db.all('SELECT id, url, events, secret, last_status, last_at, created_at FROM webhooks WHERE org_id = ? ORDER BY created_at', [c.org.id]);
    return { events: EVENTS, webhooks: rows.map(r => ({ ...r, events: parseJson(r.events, []) })) };
  });
  app.post('/api/org/webhooks', async req => {
    const c = need(req, 'admin');
    const b = (req.body || {}) as Record<string, unknown>;
    const url = String(b.url || '').trim();
    if (!/^https:\/\/[^\s]+$/.test(url) && !(app.cfg.dev && /^http:\/\/[^\s]+$/.test(url))) throw bad('url', 'Podaj adres zaczynający się od https://.');
    const events = (Array.isArray(b.events) ? b.events : []).map(String).filter(e => e in EVENTS);
    if (!events.length) throw bad('events', 'Wybierz co najmniej jedno zdarzenie.');
    if (Number((await db.one('SELECT COUNT(*) AS n FROM webhooks WHERE org_id = ?', [c.org.id]))?.n || 0) >= 10) throw bad('limit', 'Firma może mieć najwyżej 10 webhooków.');
    const id = newId('w_'), secret = newToken();
    await db.run('INSERT INTO webhooks (id, org_id, url, events, secret, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, c.org.id, url, JSON.stringify(events), secret, now()]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'webhook_created', null, null, { url });
    return { id, secret };
  });
  app.delete('/api/org/webhooks/:id', async req => {
    const c = need(req, 'admin');
    await db.run('DELETE FROM webhooks WHERE org_id = ? AND id = ?', [c.org.id, (req.params as any).id]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'webhook_deleted');
    return { ok: true };
  });
  app.post('/api/org/webhooks/:id/test', async req => {
    const c = need(req, 'admin');
    const h = await db.one('SELECT id FROM webhooks WHERE org_id = ? AND id = ?', [c.org.id, (req.params as any).id]);
    if (!h) throw new HttpError(404, 'not_found', 'Nie ma takiego webhooka.');
    const ev = parseJson<string[]>((await db.one('SELECT events FROM webhooks WHERE id = ?', [h.id]))!.events, [])[0];
    await dispatch(app, c.org.id, [{ event: ev, data: { id: 'test', name: 'Przykładowy rekord z Hermesa', test: true } }]);
    return { ok: true };
  });
}
