// Maile w historii bez integracji z pocztą: handlowiec dodaje adres firmy w Hermesie jako BCC (albo przekazuje mail),
// dostawca poczty przychodzącej (np. Postmark Inbound, Cloudflare Email Routing z workerem) wysyła wiadomość na webhook,
// a Hermes zapisuje ją w historii kontaktu. Nieznany adres klienta tworzy kontakt, a firmę dopasowuje po domenie.
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { HttpError, need, audit, parseJson } from './context.js';
import { newId, now } from './security.js';
import { warsaw } from './routes-growth.js';

type Addr = { email: string; name: string };
const FREE = new Set(['gmail.com', 'googlemail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'op.pl', 'interia.pl', 'interia.eu', 'poczta.fm', 'gazeta.pl', 'tlen.pl', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'vp.pl', 'int.pl']);

/** "Anna Nowak <anna@alfa.pl>, bok@beta.pl" na listę adresów. */
export function parseAddrs(v: unknown): Addr[] {
  if (Array.isArray(v)) return v.flatMap(x => typeof x === 'string' ? parseAddrs(x) : x && typeof x === 'object' ? [{ email: String((x as any).Email || (x as any).email || (x as any).address || '').toLowerCase().trim(), name: String((x as any).Name || (x as any).name || '').trim() }] : []).filter(a => a.email.includes('@'));
  const out: Addr[] = [];
  for (const part of String(v || '').split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
    const m = part.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/) || part.match(/^\s*()([^\s<>]+@[^\s<>]+)\s*$/);
    if (m) out.push({ name: m[1].trim(), email: m[2].toLowerCase().trim() });
  }
  return out;
}
/** Treść bez cytowanej odpowiedzi i stopki przekazania; najwyżej 2000 znaków. */
export function cleanBody(text: string) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out: string[] = [];
  for (const l of lines) {
    if (/^\s*>/.test(l)) break;
    if (/^(W dniu|On) .{6,}(napisał|napisała|wrote)( \(a\))?:\s*$/.test(l.trim())) break;
    if (/^-{2,}\s*(Original Message|Wiadomość oryginalna|Forwarded message|Przekazana wiadomość)/i.test(l.trim())) break;
    out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2000);
}
/** Ujednolica formaty dostawców: Postmark (JSON), Mailgun (formularz), prosty JSON. */
function normalize(b: Record<string, any>) {
  const get = (...k: string[]) => { for (const x of k) if (b[x] != null && b[x] !== '') return b[x]; return ''; };
  const from = parseAddrs(get('FromFull') ? [get('FromFull')] : get('From', 'from', 'sender'))[0];
  const rcpt = [...parseAddrs(get('ToFull', 'To', 'to')), ...parseAddrs(get('CcFull', 'Cc', 'cc')), ...parseAddrs(get('BccFull', 'Bcc', 'bcc')), ...parseAddrs(get('OriginalRecipient', 'recipient', 'envelope_to'))];
  return {
    from, rcpt,
    subject: String(get('Subject', 'subject') || '(bez tematu)').slice(0, 300),
    text: cleanBody(String(get('TextBody', 'stripped-text', 'body-plain', 'text', 'body') || String(get('HtmlBody', 'html')).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' '))),
    date: String(get('Date', 'date', 'timestamp') || ''),
    mid: String(get('MessageID', 'Message-Id', 'message-id', 'messageId') || '').slice(0, 300)
  };
}

export default async function inboundRoutes(app: FastifyInstance) {
  const { db, cfg } = app;
  const address = (id: string) => `${id}@${cfg.inboundDomain}`;

  app.get('/api/org/mailbox', async req => {
    const c = need(req);
    const m = await db.one('SELECT id FROM mailboxes WHERE org_id = ? ORDER BY created_at DESC LIMIT 1', [c.org.id]);
    return { enabled: !!(cfg.inboundDomain && cfg.inboundSecret), address: m && cfg.inboundDomain ? address(m.id) : null };
  });
  app.post('/api/org/mailbox', async req => {
    const c = need(req, 'admin');
    if (!cfg.inboundDomain || !cfg.inboundSecret) throw new HttpError(503, 'inbound_off', 'Poczta przychodząca nie jest skonfigurowana na serwerze.');
    await db.run('DELETE FROM mailboxes WHERE org_id = ?', [c.org.id]); /* nowy adres unieważnia poprzedni */
    const id = 'hermes-' + crypto.randomBytes(6).toString('hex');
    await db.run('INSERT INTO mailboxes (id, org_id, created_at) VALUES (?, ?, ?)', [id, c.org.id, now()]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'mailbox_created');
    return { address: address(id) };
  });

  app.post('/api/public/inbound/:secret', async (req, reply) => {
    const got = Buffer.from(String((req.params as any).secret || '')), want = Buffer.from(cfg.inboundSecret || crypto.randomBytes(16).toString('hex'));
    if (!cfg.inboundSecret || got.length !== want.length || !crypto.timingSafeEqual(got, want)) throw new HttpError(404, 'not_found', 'Nie znaleziono.');
    const m = normalize((req.body || {}) as Record<string, any>);
    const box = m.rcpt.find(a => a.email.endsWith('@' + cfg.inboundDomain));
    const mb = box ? await db.one('SELECT org_id FROM mailboxes WHERE id = ?', [box.email.split('@')[0]]) : null;
    if (!mb || !m.from) return reply.send({ ok: true, logged: 0 }); /* dostawca nie ponawia, a nieznany adres niczego nie zdradza */
    const org = mb.org_id;
    const team = await db.all('SELECT u.email, u.name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ?', [org]);
    const member = (e: string) => team.find(t => String(t.email).toLowerCase() === e);
    const sender = member(m.from.email);
    /* wysłane przez kogoś z zespołu: klientami są odbiorcy; przekazane lub od klienta: klientem jest nadawca */
    const isTeam = (e: string) => !!member(e) || e.endsWith('@' + cfg.inboundDomain);
    const people = sender ? m.rcpt.filter(a => !isTeam(a.email)) : [m.from];
    const uniq = [...new Map(people.map(p => [p.email, p])).values()].slice(0, 10);
    if (!uniq.length) return reply.send({ ok: true, logged: 0 });
    const recs = (await db.all("SELECT type, data FROM records WHERE org_id = ? AND deleted = 0 AND type IN ('contact', 'company', 'activity')", [org])).map(r => ({ ...parseJson<any>(r.data, {}), _t: r.type }));
    const d = m.date && !Number.isNaN(Date.parse(m.date)) ? new Date(m.date) : new Date();
    const at = warsaw(d).at, day = warsaw(d).day, t = now();
    const put: { type: string; data: Record<string, unknown> }[] = [];
    let logged = 0;
    for (const p of uniq) {
      let contact = recs.find(r => r._t === 'contact' && String(r.email || '').toLowerCase() === p.email);
      if (!contact) {
        const domain = p.email.split('@')[1];
        const comp = FREE.has(domain) ? null : recs.find(r => r._t === 'company' && String(r.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') === domain);
        const data = { id: newId('p'), name: p.name || p.email, email: p.email, phone: '', company: comp?.id || '', role: '', created: day };
        put.push({ type: 'contact', data }); contact = { ...data, _t: 'contact' }; recs.push(contact);
      }
      if (m.mid && recs.some(r => r._t === 'activity' && r.mid === m.mid && r.rid === contact!.id)) continue;
      const act = { id: newId('a'), obj: 'contact', rid: contact.id, type: 'email', text: `${sender ? 'Wysłano' : 'Otrzymano'}: ${m.subject}${m.text ? '\n\n' + m.text : ''}`, at, mid: m.mid || undefined, by: sender?.name || undefined, via: 'bcc' };
      put.push({ type: 'activity', data: act }); logged++;
    }
    await db.tx(async tx => {
      for (const r of put) await tx.run('INSERT INTO records (org_id, type, id, data, owner, updated_at, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [org, r.type, r.data.id, JSON.stringify(r.data), null, t, null]);
    });
    return reply.send({ ok: true, logged });
  });
}
