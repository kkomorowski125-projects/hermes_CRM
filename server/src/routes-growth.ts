// Faza 2 roadmapy: dane firmy po NIP (Biała lista MF), formularz leada na stronę i webhook, poranny plan dnia mailem.
import type { FastifyInstance } from 'fastify';
import { HttpError, bad, need, audit, parseJson } from './context.js';
import { newId, now, limiter } from './security.js';
import { layout } from './mail.js';
import { runOnboarding } from './onboarding.js';
import { dispatch } from './webhooks.js';
import { runWeekly } from './reports.js';

/** Data i godzina w Polsce, niezależnie od strefy serwera. */
export function warsaw(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), at: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` };
}
export function nipValid(nip: string) {
  if (!/^\d{10}$/.test(nip)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((a, x, i) => a + x * Number(nip[i]), 0) % 11;
  return sum !== 10 && sum === Number(nip[9]);
}
const title = (s: string) => s.toLowerCase().replace(/(^|[\s\-.(])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
const FORMS: Record<string, string> = { 'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ': 'Sp. z o.o.', 'SPÓŁKA AKCYJNA': 'S.A.', 'SPÓŁKA KOMANDYTOWA': 'Sp.k.', 'SPÓŁKA JAWNA': 'Sp.j.', 'SPÓŁKA CYWILNA': 's.c.', 'PROSTA SPÓŁKA AKCYJNA': 'P.S.A.' };
/** Nazwa z rejestru (wielkimi literami, pełna forma prawna) w czytelnej postaci. */
export function prettyName(raw: string) {
  let n = raw.trim(), suffix = '';
  for (const [k, v] of Object.entries(FORMS).sort((a, b) => b[0].length - a[0].length)) if (n.toUpperCase().endsWith(k)) { n = n.slice(0, -k.length).trim(); suffix = ' ' + v; break; }
  return (n === n.toUpperCase() ? title(n) : n) + suffix;
}
export function cityOf(addr: string) {
  const m = String(addr || '').match(/\d{2}-\d{3}\s+(.+)$/);
  return m ? title(m[1].trim()) : '';
}

const OPEN_DEAL = (d: any) => d.stage !== 'Wygrana' && d.stage !== 'Przegrana';
const OPEN_LEAD = (l: any) => ['Nowy', 'W kontakcie', 'Kwalifikacja'].includes(l.status);

/** Poranny plan: zadania i kroki z terminem na dziś lub wcześniej, wysyłane raz dziennie każdej osobie. */
export async function runDigest(app: FastifyInstance, at = new Date()) {
  const { db, cfg } = app;
  const { day } = warsaw(at);
  const people = await db.all(`SELECT m.org_id, m.role, u.id AS user_id, u.email, u.name, u.prefs, o.name AS org_name FROM memberships m
    JOIN users u ON u.id = m.user_id JOIN orgs o ON o.id = m.org_id WHERE m.role <> 'viewer'`);
  const cache = new Map<string, any[]>();
  let sent = 0;
  for (const p of people) {
    if (parseJson<any>(p.prefs, {}).digest === false) continue;
    if (await db.one('SELECT 1 AS x FROM digests WHERE user_id = ? AND org_id = ? AND day = ?', [p.user_id, p.org_id, day])) continue;
    if (!cache.has(p.org_id)) cache.set(p.org_id, (await db.all("SELECT type, data FROM records WHERE org_id = ? AND deleted = 0 AND type IN ('task', 'lead', 'deal', 'company', 'contact')", [p.org_id])).map(r => ({ type: r.type, ...parseJson<any>(r.data, {}) })));
    const recs = cache.get(p.org_id)!;
    const mine = (owner: unknown) => owner === p.name || (!owner && p.role === 'admin');
    const label = (type: string, id: string) => { const r = recs.find(x => x.type === type && x.id === id); return r ? `${type === 'deal' ? 'Szansa' : type === 'lead' ? 'Lead' : type === 'company' ? 'Firma' : 'Kontakt'}: ${r.name}` : ''; };
    const items: string[] = [];
    for (const t of recs.filter(r => r.type === 'task' && !r.done && r.due && r.due <= day && mine(r.owner) && label(r.obj, r.rid)))
      items.push(`${t.title} (${label(t.obj, t.rid)})${t.due < day ? ', po terminie' : ''}`);
    for (const r of recs.filter(r => ((r.type === 'deal' && OPEN_DEAL(r)) || (r.type === 'lead' && OPEN_LEAD(r))) && r.nextDate && r.nextDate <= day && mine(r.owner)))
      items.push(`${r.nextStep || 'Następny krok'} (${label(r.type, r.id)})${r.nextDate < day ? ', po terminie' : ''}`);
    await db.run('INSERT INTO digests (user_id, org_id, day) VALUES (?, ?, ?)', [p.user_id, p.org_id, day]);
    if (!items.length) continue;
    const first = String(p.name).split(/\s+/)[0];
    const m = layout([`Dzień dobry${first ? ', ' + first : ''}. Na dziś w ${p.org_name} masz ${items.length} ${items.length === 1 ? 'rzecz' : items.length < 5 ? 'rzeczy' : 'rzeczy'} do zrobienia:`, ...items.slice(0, 15).map(x => '• ' + x), ...(items.length > 15 ? [`…i ${items.length - 15} więcej w aplikacji.`] : [])],
      { label: 'Otwórz plan dnia', url: cfg.publicUrl + '/' }, 'Poranny plan wyłączysz w Ustawieniach Hermesa.');
    if (await app.mail.send({ to: p.email, subject: `Plan na dziś: ${items.length} ${items.length === 1 ? 'rzecz' : 'rzeczy'}`, ...m })) sent++;
  }
  return sent;
}
export function startJobs(app: FastifyInstance) {
  const tick = () => {
    const h = warsaw().hour;
    if (app.cfg.digestHour >= 0 && h === app.cfg.digestHour) runDigest(app).catch(e => app.log.error(e, 'Poranny plan nieudany'));
    if (h === 10) runOnboarding(app).catch(e => app.log.error(e, 'Seria powitalna nieudana'));
    if (h === 8 && new Date().getUTCDay() === 1) runWeekly(app).catch(e => app.log.error(e, 'Raport tygodniowy nieudany'));
  };
  const t = setInterval(tick, 10 * 60e3); tick();
  return () => clearInterval(t);
}

export default async function growthRoutes(app: FastifyInstance) {
  const { db, cfg } = app;

  /* ---- dane firmy po NIP ---- */
  const nipLimit = limiter(60, 60 * 60e3);
  app.get('/api/nip/:nip', async req => {
    const c = need(req);
    const nip = String((req.params as any).nip || '').replace(/\D/g, '');
    if (!nipValid(nip)) throw bad('nip', 'To nie jest poprawny NIP.');
    if (!nipLimit(c.org.id)) throw new HttpError(429, 'too_many', 'Za dużo zapytań o NIP. Spróbuj za godzinę.');
    let data: any;
    try {
      const res = await fetch(`${cfg.nipApi}/api/search/nip/${nip}?date=${warsaw().day}`, { headers: { accept: 'application/json' } });
      data = await res.json();
      if (!res.ok && res.status !== 400) throw new Error(String(res.status));
    } catch (e: any) {
      app.log.warn({ err: e?.message }, 'Biała lista MF niedostępna');
      throw new HttpError(502, 'nip_api', 'Rejestr MF nie odpowiada. Spróbuj za chwilę.');
    }
    const s = data?.result?.subject;
    if (!s) throw new HttpError(404, 'nip_not_found', 'Nie znaleziono firmy z tym NIP w rejestrze VAT.');
    const addr = s.workingAddress || s.residenceAddress || '';
    return { nip, name: prettyName(s.name || ''), officialName: s.name, address: title(addr).replace(/\bUl\./g, 'ul.'), city: cityOf(addr), regon: s.regon || '', krs: s.krs || '', vat: s.statusVat || '' };
  });

  /* ---- formularz leada na stronę i webhook ---- */
  app.get('/api/org/forms', async req => {
    const c = need(req, 'admin');
    const rows = await db.all('SELECT id, created_at FROM lead_forms WHERE org_id = ? ORDER BY created_at', [c.org.id]);
    return { forms: rows.map(r => ({ id: r.id, created_at: r.created_at, url: `${cfg.publicUrl}/api/public/forms/${r.id}` })) };
  });
  app.post('/api/org/forms', async req => {
    const c = need(req, 'admin');
    const id = newId('f_');
    await db.run('INSERT INTO lead_forms (id, org_id, created_by, created_at) VALUES (?, ?, ?, ?)', [id, c.org.id, c.user.id, now()]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'form_created', null, null, { id });
    return { id, url: `${cfg.publicUrl}/api/public/forms/${id}` };
  });
  app.delete('/api/org/forms/:id', async req => {
    const c = need(req, 'admin');
    await db.run('DELETE FROM lead_forms WHERE org_id = ? AND id = ?', [c.org.id, (req.params as any).id]);
    await audit(db, { orgId: c.org.id, userId: c.user.id }, 'form_deleted', null, null, { id: (req.params as any).id });
    return { ok: true };
  });

  const formLimit = limiter(20, 60 * 60e3);
  const cors = (reply: any) => reply.header('access-control-allow-origin', '*').header('access-control-allow-methods', 'POST, OPTIONS').header('access-control-allow-headers', 'content-type');
  app.options('/api/public/forms/:id', async (_req, reply) => { cors(reply); return reply.status(204).send(); });
  app.post('/api/public/forms/:id', async (req, reply) => {
    cors(reply);
    const f = await db.one('SELECT org_id FROM lead_forms WHERE id = ?', [(req.params as any).id]);
    if (!f) throw new HttpError(404, 'form_not_found', 'Formularz nie istnieje.');
    const b = (req.body || {}) as Record<string, unknown>;
    const v = (k: string, max = 200) => (typeof b[k] === 'string' || typeof b[k] === 'number' ? String(b[k]).trim().slice(0, max) : '');
    const html = String(req.headers.accept || '').includes('text/html');
    const done = () => {
      const r = v('redirect', 500);
      if (/^https?:\/\//.test(r)) return reply.redirect(r, 303);
      if (html) return reply.type('text/html; charset=utf-8').send('<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dziękujemy</title><body style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#41434D"><h1 style="color:#15161A">Dziękujemy!</h1><p>Wiadomość dotarła. Odezwiemy się najszybciej, jak to możliwe.</p></body></html>');
      return { ok: true };
    };
    if (v('website')) return done(); /* pułapka na boty: pole ukryte dla ludzi */
    if (!formLimit(req.ip + '|' + f.org_id)) throw new HttpError(429, 'too_many', 'Za dużo zgłoszeń. Spróbuj za godzinę.');
    const name = v('name'), email = v('email').toLowerCase(), phone = v('phone', 40), company = v('company'), message = v('message', 4000);
    if (!name && !email && !phone && !company) throw bad('empty', 'Podaj imię, email albo telefon.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('email', 'Podaj poprawny adres email.');
    const w = warsaw(), t = now();
    const admin = await db.one("SELECT u.name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND m.role = 'admin' ORDER BY m.created_at LIMIT 1", [f.org_id]);
    const recs = (await db.all("SELECT type, data FROM records WHERE org_id = ? AND deleted = 0 AND type IN ('company', 'contact')", [f.org_id])).map(r => ({ type: r.type, ...parseJson<any>(r.data, {}) }));
    const low = (s: unknown) => String(s || '').trim().toLowerCase();
    const put: { type: string; data: Record<string, unknown> }[] = [];
    let comp = company ? recs.find(r => r.type === 'company' && low(r.name) === low(company)) : null;
    if (company && !comp) { comp = { id: newId('c'), name: company, created: w.day }; put.push({ type: 'company', data: comp }); }
    let person = email ? recs.find(r => r.type === 'contact' && low(r.email) === email) : null;
    if (!person && (name || email || phone)) { person = { id: newId('p'), name: name || email || phone, email, phone, company: comp?.id || '', created: w.day }; put.push({ type: 'contact', data: person }); }
    const src = ['Strona www', 'Polecenie', 'Targi', 'Cold mailing', 'LinkedIn', 'Inne'].includes(v('source')) ? v('source') : 'Strona www';
    const lead = { id: newId('l'), name: company || name || email, company: comp?.id || '', contacts: person ? [person.id] : [], source: src, status: 'Nowy', statusAt: w.day, icp: '', disqReason: '', dealId: '', value: Number(v('value').replace(/[^\d.]/g, '')) || 0, owner: admin?.name || '', nextStep: 'Odpowiedzieć na zapytanie ze strony', nextDate: w.day, created: w.day };
    /* automatyzacje z Ustawień: przydział opiekuna i zadania dla nowego leada */
    const orgRow = await db.one('SELECT settings FROM orgs WHERE id = ?', [f.org_id]);
    const rules = (parseJson<any>(orgRow?.settings, {}).rules || []).filter((r: any) => r && r.on === 'lead' && (!r.source || r.source === src));
    for (const r of rules.filter((r: any) => r.do === 'owner' && r.owner)) {
      if (r.owner === '__rr') {
        const team = await db.all("SELECT u.name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND m.role <> 'viewer' ORDER BY m.created_at", [f.org_id]);
        const open = (await db.all("SELECT owner FROM records WHERE org_id = ? AND type = 'lead' AND deleted = 0", [f.org_id])).map(x => x.owner);
        const pick = team.map(m => ({ n: m.name, c: open.filter(o => o === m.name).length })).sort((a, b) => a.c - b.c)[0];
        if (pick) lead.owner = pick.n;
      } else lead.owner = r.owner;
    }
    put.push({ type: 'lead', data: lead });
    put.push({ type: 'activity', data: { id: newId('a'), obj: 'lead', rid: lead.id, type: 'note', text: `Zgłoszenie z formularza na stronie${message ? ': ' + message : '.'}`, at: w.at } });
    for (const r of rules.filter((r: any) => r.do === 'task' && r.title))
      put.push({ type: 'task', data: { id: newId('t'), obj: 'lead', rid: lead.id, title: String(r.title).slice(0, 200), due: warsaw(new Date(Date.now() + (Number(r.days) || 0) * 864e5)).day, owner: lead.owner, done: '', created: w.day, auto: true } });
    await db.tx(async tx => {
      for (const r of put) await tx.run('INSERT INTO records (org_id, type, id, data, owner, updated_at, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
        [f.org_id, r.type, r.data.id, JSON.stringify(r.data), r.type === 'lead' ? (lead.owner || null) : null, t, null]);
      await audit(tx, { orgId: f.org_id }, 'record_created', 'lead', lead.id, { name: lead.name, via: 'form' });
    });
    void dispatch(app, f.org_id, [{ event: 'lead.created', data: lead }]).catch(() => {});
    return done();
  });
}
