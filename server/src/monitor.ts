// Monitoring bez zewnętrznych usług: identyfikator każdego zapytania, alert o błędach serwera na webhook
// (Slack, Teams, Discord lub dowolny odbiornik JSON) i zgłoszenia błędów z przeglądarki do logu.
import type { FastifyInstance } from 'fastify';
import { limiter } from './security.js';

export function alerter(url: string, log: { warn: (o: object, m: string) => void }) {
  let last = 0, skipped = 0;
  return async (title: string, detail: Record<string, unknown>) => {
    if (!url) return false;
    if (Date.now() - last < 60e3) { skipped++; return false; } /* najwyżej jeden alert na minutę */
    last = Date.now();
    const text = `Hermes CRM: ${title}${skipped ? ` (pominięto ${skipped} wcześniejszych)` : ''}\n` + Object.entries(detail).map(([k, v]) => `${k}: ${String(v).slice(0, 300)}`).join('\n');
    skipped = 0;
    try { await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, content: text }) }); return true; }
    catch (e: any) { log.warn({ err: e?.message }, 'Alert nie dotarł'); return false; }
  };
}

export default async function monitorRoutes(app: FastifyInstance) {
  const perIp = limiter(20, 10 * 60e3);
  /** Błędy JavaScript z przeglądarki: trafiają do logu serwera z identyfikatorem firmy i osoby. */
  app.post('/api/client-errors', async req => {
    if (!perIp('ce|' + req.ip)) return { ok: false };
    const b = (req.body || {}) as Record<string, unknown>;
    req.log.warn({ client: { message: String(b.message || '').slice(0, 500), source: String(b.source || '').slice(0, 200), line: Number(b.line) || 0, stack: String(b.stack || '').slice(0, 2000) }, org: req.ctx?.org.id, user: req.ctx?.user.id }, 'Błąd w przeglądarce');
    return { ok: true };
  });
}
