// Oferty: pozycje z szansy, numer, strona dla klienta pod tajnym linkiem, wydruk do PDF i akceptacja online.
import type { FastifyInstance } from 'fastify';
import { HttpError, bad, need, audit, parseJson } from './context.js';
import { newId, newToken, now, limiter } from './security.js';
import { warsaw } from './routes-growth.js';
import { dispatch } from './webhooks.js';
import { layout } from './mail.js';

type Item = { name: string; qty: number; unit: string; price: number; discount: number; vat: number };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (n: number) => (Math.round(n * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
const pdate = (iso: string) => iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export function totals(items: Item[]) {
  let net = 0, vat = 0;
  const lines = items.map(i => {
    const n = Math.round(i.qty * i.price * (1 - i.discount / 100) * 100) / 100;
    const v = i.vat >= 0 ? Math.round(n * i.vat) / 100 : 0;
    net += n; vat += v;
    return { ...i, net: n, vatAmount: v, gross: n + v };
  });
  return { lines, net: Math.round(net * 100) / 100, vat: Math.round(vat * 100) / 100, gross: Math.round((net + vat) * 100) / 100 };
}
function clean(raw: any): Item[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 100).map((i: any) => ({
    name: String(i?.name || '').trim().slice(0, 300), qty: Math.max(0, Number(i?.qty) || 0), unit: String(i?.unit || 'szt.').slice(0, 20),
    price: Math.max(0, Number(i?.price) || 0), discount: Math.min(100, Math.max(0, Number(i?.discount) || 0)), vat: [23, 8, 5, 0, -1].includes(Number(i?.vat)) ? Number(i.vat) : 23
  })).filter(i => i.name && i.qty > 0);
}

function page(o: any, d: any, status: string, flash = '') {
  const t = totals(d.items);
  const vatLabel = (v: number) => v < 0 ? 'zw.' : v + '%';
  const accepted = status === 'accepted';
  const expired = !accepted && d.validUntil && d.validUntil < warsaw().day;
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Oferta ${esc(d.number)} · ${esc(d.seller?.name)}</title>
<style>
:root{--ink:#15161A;--text:#41434D;--mute:#656874;--line:#D5D6DD;--line2:#E5E6EB;--accent:#5B61B8;--soft:#F1F2FB;--ok:#3F8A66}
*{box-sizing:border-box}body{margin:0;background:#F7F8F5;color:var(--text);font:15px/1.5 Arial,Helvetica,sans-serif}
.doc{max-width:860px;margin:32px auto;padding:44px 48px;background:#fff;border:1px solid var(--line);border-radius:12px}
h1{margin:0;color:var(--ink);font-size:28px;letter-spacing:-.01em}.num{color:var(--mute);font-size:14px;margin:4px 0 28px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}.parties h3{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}.parties p{margin:0;white-space:pre-line}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;font-size:12px;color:var(--mute);font-weight:600;padding:8px 6px;border-bottom:1px solid var(--line)}td{padding:10px 6px;border-bottom:1px solid var(--line2);vertical-align:top}.r{text-align:right;white-space:nowrap}
.sum{margin:18px 0 0 auto;width:min(340px,100%)}.sum div{display:flex;justify-content:space-between;padding:4px 0}.sum .g{border-top:1px solid var(--line);margin-top:6px;padding-top:10px;font-size:18px;font-weight:700;color:var(--ink)}
.notes{margin-top:26px;padding:14px 16px;border-radius:8px;background:var(--soft);white-space:pre-line}.meta{margin-top:18px;color:var(--mute);font-size:13px}
.accept{margin-top:30px;padding:22px;border:1px solid var(--line);border-radius:10px}.accept h2{margin:0 0 6px;font-size:18px;color:var(--ink)}.accept p{margin:0 0 14px}
.row{display:flex;gap:10px;flex-wrap:wrap}input{flex:1;min-width:220px;height:44px;padding:0 12px;border:1px solid var(--line);border-radius:8px;font:inherit}
button{height:44px;padding:0 18px;border:0;border-radius:8px;background:var(--accent);color:#fff;font:600 15px Arial,sans-serif;cursor:pointer}.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.ok{margin-top:30px;padding:16px 18px;border-radius:10px;background:#EAF5EF;color:#235E42;font-weight:600}.warn{margin-top:30px;padding:16px 18px;border-radius:10px;background:#FFF6E5;color:#7A5A12}
.tools{max-width:860px;margin:16px auto 0;display:flex;justify-content:flex-end;gap:8px;padding:0 16px}
@media (max-width:700px){.doc{margin:12px;padding:24px 18px}.parties{grid-template-columns:1fr}.hide-s{display:none}}
@media print{body{background:#fff}.doc{margin:0;border:0;padding:0}.tools,.accept{display:none}}
</style></head><body>
<div class="tools"><button class="ghost" onclick="window.print()">Pobierz PDF lub drukuj</button></div>
<main class="doc">
<h1>Oferta handlowa</h1><p class="num">Nr ${esc(d.number)} · z dnia ${esc(pdate(d.date))}${d.validUntil ? ` · ważna do ${esc(pdate(d.validUntil))}` : ''}</p>
<div class="parties"><div><h3>Sprzedawca</h3><p><b>${esc(d.seller?.name)}</b>${d.seller?.details ? '\n' + esc(d.seller.details) : ''}</p></div><div><h3>Dla</h3><p><b>${esc(d.buyer?.name)}</b>${d.buyer?.details ? '\n' + esc(d.buyer.details) : ''}</p></div></div>
${d.intro ? `<p>${esc(d.intro)}</p>` : ''}
<table><thead><tr><th>Pozycja</th><th class="r">Ilość</th><th class="r hide-s">Cena netto</th><th class="r hide-s">Rabat</th><th class="r hide-s">VAT</th><th class="r">Wartość netto</th></tr></thead><tbody>
${t.lines.map(l => `<tr><td>${esc(l.name)}</td><td class="r">${esc(String(l.qty).replace('.', ','))} ${esc(l.unit)}</td><td class="r hide-s">${money(l.price)}</td><td class="r hide-s">${l.discount ? esc(l.discount) + '%' : '·'}</td><td class="r hide-s">${vatLabel(l.vat)}</td><td class="r">${money(l.net)}</td></tr>`).join('')}
</tbody></table>
<div class="sum"><div><span>Razem netto</span><span>${money(t.net)}</span></div><div><span>VAT</span><span>${money(t.vat)}</span></div><div class="g"><span>Razem brutto</span><span>${money(t.gross)}</span></div></div>
${d.notes ? `<div class="notes">${esc(d.notes)}</div>` : ''}
<p class="meta">${d.terms ? esc(d.terms) + ' · ' : ''}Przygotował: ${esc(d.author || '')}${d.authorEmail ? ', ' + esc(d.authorEmail) : ''}</p>
${flash ? `<div class="ok">${esc(flash)}</div>` : accepted ? `<div class="ok">Oferta zaakceptowana przez: ${esc(o.accepted_name)}, ${esc(pdate(String(o.accepted_at).slice(0, 10)))}. Dziękujemy!</div>` : expired ? `<div class="warn">Termin ważności oferty minął. Skontaktuj się z nami, a przygotujemy aktualną wersję.</div>` : status === 'withdrawn' ? `<div class="warn">Ta oferta została wycofana.</div>` : `
<form class="accept" method="post" action="/api/public/offers/${esc(o.id)}/accept"><h2>Akceptacja oferty</h2><p>Wpisz imię i nazwisko osoby akceptującej. Sprzedawca od razu dostanie informację.</p>
<div class="row"><input name="name" required maxlength="120" placeholder="Imię i nazwisko" autocomplete="name"><input name="website" style="display:none" tabindex="-1" autocomplete="off"><button type="submit">Akceptuję ofertę</button></div></form>`}
</main></body></html>`;
}

export default async function offerRoutes(app: FastifyInstance) {
  const { db, cfg } = app;
  const url = (id: string) => `${cfg.publicUrl}/oferta/${id}`;

  app.post('/api/offers', async req => {
    const c = need(req);
    if (c.role === 'viewer') throw new HttpError(403, 'read_only', 'Masz dostęp tylko do podglądu.');
    const b = (req.body || {}) as Record<string, any>;
    const deal = await db.one("SELECT data, owner FROM records WHERE org_id = ? AND type = 'deal' AND id = ? AND deleted = 0", [c.org.id, String(b.dealId || '')]);
    if (!deal) throw new HttpError(404, 'not_found', 'Nie ma takiej szansy.');
    if (c.visibility === 'own' && c.role !== 'admin' && deal.owner && deal.owner !== c.user.name) throw new HttpError(403, 'not_owner', 'To szansa innego opiekuna.');
    const items = clean(b.items);
    if (!items.length) throw bad('items', 'Dodaj co najmniej jedną pozycję z ilością.');
    const w = warsaw();
    const n = Number((await db.one('SELECT COUNT(*) AS n FROM offers WHERE org_id = ? AND created_at >= ?', [c.org.id, w.day.slice(0, 7) + '-01']))?.n || 0) + 1;
    const s = parseJson<any>((await db.one('SELECT settings FROM orgs WHERE id = ?', [c.org.id]))?.settings, {}).offer || {};
    const days = Math.min(180, Math.max(1, Number(b.validDays) || Number(s.validDays) || 14));
    const data = {
      number: `${s.prefix || 'OF'}/${w.day.slice(0, 4)}/${w.day.slice(5, 7)}/${String(n).padStart(3, '0')}`, date: w.day, validUntil: warsaw(new Date(Date.now() + days * 864e5)).day,
      seller: { name: String(s.seller || c.org.name).slice(0, 200), details: String(s.details || '').slice(0, 800) },
      buyer: { name: String(b.buyer?.name || '').slice(0, 200), details: String(b.buyer?.details || '').slice(0, 800) },
      intro: String(b.intro || '').slice(0, 2000), notes: String(b.notes ?? s.notes ?? '').slice(0, 3000), terms: String(s.terms || '').slice(0, 300),
      items, author: c.user.name, authorEmail: c.user.email
    };
    const id = newToken().slice(0, 24);
    await db.run('INSERT INTO offers (id, org_id, deal_id, data, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, c.org.id, String(b.dealId), JSON.stringify(data), 'sent', c.user.id, now()]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'offer_created', 'deal', String(b.dealId), { name: data.number });
    return { id, url: url(id), number: data.number, totals: totals(items) };
  });
  app.get('/api/offers', async req => {
    const c = need(req);
    const rows = await db.all('SELECT id, deal_id, data, status, accepted_name, accepted_at, viewed_at, created_at FROM offers WHERE org_id = ? AND deal_id = ? ORDER BY created_at DESC', [c.org.id, String((req.query as any).deal || '')]);
    return { offers: rows.map(r => { const d = parseJson<any>(r.data, {}); return { id: r.id, url: url(r.id), number: d.number, gross: totals(d.items || []).gross, net: totals(d.items || []).net, status: r.status, accepted_name: r.accepted_name, accepted_at: r.accepted_at, viewed_at: r.viewed_at, created_at: r.created_at, validUntil: d.validUntil }; }) };
  });
  app.post('/api/offers/:id/withdraw', async req => {
    const c = need(req);
    if (c.role === 'viewer') throw new HttpError(403, 'read_only', 'Masz dostęp tylko do podglądu.');
    await db.run("UPDATE offers SET status = 'withdrawn' WHERE org_id = ? AND id = ? AND status = 'sent'", [c.org.id, (req.params as any).id]);
    return { ok: true };
  });

  /** Zapis w historii szansy, bezpośrednio w bazie (klient nie ma sesji). */
  const log = async (orgId: string, dealId: string, text: string, type = 'system') => {
    const w = warsaw(), t = now(), id = newId('a');
    await db.run('INSERT INTO records (org_id, type, id, data, owner, updated_at, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [orgId, 'activity', id, JSON.stringify({ id, obj: 'deal', rid: dealId, type, text, at: w.at }), null, t, null]);
  };
  app.get('/oferta/:id', async (req, reply) => {
    const o = await db.one('SELECT * FROM offers WHERE id = ?', [(req.params as any).id]);
    reply.header('cache-control', 'no-store').header('x-robots-tag', 'noindex');
    if (!o) return reply.status(404).type('text/html; charset=utf-8').send('<!doctype html><meta charset="utf-8"><title>Nie znaleziono</title><p style="font-family:Arial;margin:60px auto;max-width:480px">Ta oferta nie istnieje albo link jest niepełny.</p>');
    const d = parseJson<any>(o.data, {});
    if (!o.viewed_at && !req.headers.cookie?.includes('hermes_session')) {
      await db.run('UPDATE offers SET viewed_at = ? WHERE id = ?', [now(), o.id]);
      await log(o.org_id, o.deal_id, `Klient otworzył ofertę ${d.number}`);
    }
    return reply.type('text/html; charset=utf-8').send(page(o, d, o.status));
  });
  const acceptLimit = limiter(10, 60 * 60e3);
  app.post('/api/public/offers/:id/accept', async (req, reply) => {
    const o = await db.one('SELECT * FROM offers WHERE id = ?', [(req.params as any).id]);
    if (!o) throw new HttpError(404, 'not_found', 'Nie ma takiej oferty.');
    const b = (req.body || {}) as Record<string, unknown>;
    const d = parseJson<any>(o.data, {});
    const html = !String(req.headers['content-type'] || '').includes('json');
    const name = String(b.name || '').trim().slice(0, 120);
    if (b.website) return html ? reply.type('text/html; charset=utf-8').send(page(o, d, o.status)) : { ok: true };
    if (!acceptLimit(req.ip)) throw new HttpError(429, 'too_many', 'Za dużo prób. Spróbuj za godzinę.');
    if (o.status !== 'sent') throw new HttpError(409, 'not_open', 'Tej oferty nie można już zaakceptować.');
    if (d.validUntil && d.validUntil < warsaw().day) throw new HttpError(409, 'expired', 'Termin ważności oferty minął.');
    if (name.length < 3) throw bad('name', 'Podaj imię i nazwisko.');
    const at = now();
    await db.run("UPDATE offers SET status = 'accepted', accepted_name = ?, accepted_at = ? WHERE id = ? AND status = 'sent'", [name, at, o.id]);
    const t = totals(d.items || []);
    await log(o.org_id, o.deal_id, `Klient zaakceptował ofertę ${d.number} (${money(t.net)} netto). Akceptuje: ${name}`);
    await audit(db, { orgId: o.org_id }, 'offer_accepted', 'deal', o.deal_id, { name: d.number, by: name });
    const deal = await db.one("SELECT data FROM records WHERE org_id = ? AND type = 'deal' AND id = ?", [o.org_id, o.deal_id]);
    const dd = parseJson<any>(deal?.data, {});
    void dispatch(app, o.org_id, [{ event: 'offer.accepted', data: { ...dd, offer: { number: d.number, net: t.net, gross: t.gross, accepted_by: name } } }]).catch(() => {});
    const author = await db.one('SELECT email, name FROM users WHERE id = ?', [o.created_by]);
    if (author) void app.mail.send({ to: author.email, subject: `Oferta ${d.number} zaakceptowana`, ...layout([`${name} zaakceptował(a) ofertę ${d.number} dla ${d.buyer?.name || dd.name || 'klienta'} na ${money(t.net)} netto.`, 'Czas na kolejny krok: umowa albo faktura.'], { label: 'Otwórz szansę', url: cfg.publicUrl + '/' }) }).catch(() => {});
    if (html) return reply.type('text/html; charset=utf-8').send(page({ ...o, status: 'accepted', accepted_name: name, accepted_at: at }, d, 'accepted', `Dziękujemy, ${name}. Oferta została zaakceptowana, a sprzedawca dostał informację.`));
    return { ok: true };
  });
}
