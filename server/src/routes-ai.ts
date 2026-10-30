// Hermes AI przez serwer: klucz Claude API tylko w zmiennych środowiskowych, dzienny limit wywołań na firmę.
import type { FastifyInstance } from 'fastify';
import { HttpError, bad, need, audit } from './context.js';

export default async function aiRoutes(app: FastifyInstance) {
  const { db, cfg } = app;
  const today = () => new Date().toISOString().slice(0, 10);
  const used = async (orgId: string) => Number((await db.one('SELECT calls FROM ai_usage WHERE org_id = ? AND day = ?', [orgId, today()]))?.calls || 0);

  app.get('/api/ai/status', async req => {
    const c = need(req);
    return { enabled: !!cfg.anthropicKey, model: cfg.anthropicModel, limit: cfg.aiDailyLimit, used: await used(c.org.id) };
  });

  app.post('/api/ai/messages', async req => {
    const c = need(req);
    if (!cfg.anthropicKey) throw new HttpError(503, 'ai_disabled', 'Hermes AI nie jest skonfigurowany na serwerze.');
    const b = (req.body || {}) as { system?: unknown; messages?: unknown; max_tokens?: unknown };
    if (!Array.isArray(b.messages) || !b.messages.length) throw bad('messages', 'Brak wiadomości.');
    const messages = b.messages.slice(-20).map((m: any) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content ?? '').slice(0, 200000) }));
    if (await used(c.org.id) >= cfg.aiDailyLimit) throw new HttpError(429, 'ai_limit', `Wykorzystano dzienny limit Hermes AI (${cfg.aiDailyLimit} zapytań). Limit odnowi się jutro.`);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.anthropicKey, 'anthropic-version': cfg.anthropicVersion },
      body: JSON.stringify({ model: cfg.anthropicModel, max_tokens: Math.min(2000, Number(b.max_tokens) || 1200), system: typeof b.system === 'string' ? b.system.slice(0, 400000) : undefined, messages })
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) { app.log.warn({ status: res.status, err: data?.error }, 'Błąd Claude API'); throw new HttpError(502, 'ai_error', 'Claude API nie odpowiedziało poprawnie. Spróbuj ponownie.'); }
    const upd = await db.run('UPDATE ai_usage SET calls = calls + 1 WHERE org_id = ? AND day = ?', [c.org.id, today()]);
    if (!upd) await db.run('INSERT INTO ai_usage (org_id, day, calls) VALUES (?, ?, 1)', [c.org.id, today()]);
    if ((await used(c.org.id)) === 1) await audit(db, { orgId: c.org.id, userId: c.user.id }, 'ai_first_use_today');
    return { text: (data.content || []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n').trim() };
  });
}
