// Umawianie spotkań przez link (jak Calendly): klient wybiera wolny termin, a Hermes sam zapisuje spotkanie w CRM.
// Rezerwacja tworzy albo odnajduje kontakt, podpina spotkanie pod otwartą szansę lub leada (albo zakłada leada),
// ustawia następny krok i wysyła obu stronom potwierdzenie z zaproszeniem .ics. Klient może odwołać spotkanie z maila.
import type { FastifyInstance } from 'fastify';
import { HttpError, bad, need, audit, parseJson } from './context.js';
import { newId, newToken, now, limiter } from './security.js';
import { warsaw } from './routes-growth.js';
import { dispatch } from './webhooks.js';
import { layout } from './mail.js';
import { cleanBooking, freeSlots, zoned, ics, whenLabel, type Busy, type BookingSettings } from './booking.js';
import type { Db } from './db.js';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const CLOSED_DEAL = ['Wygrana', 'Przegrana'], CLOSED_LEAD = ['Skonwertowany', 'Odrzucony'];
const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'op.pl', 'interia.pl', 'interia.eu', 'poczta.fm', 'gazeta.pl', 'tlen.pl', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'vp.pl', 'int.pl']);
const localAt = (iso: string) => warsaw(new Date(iso)).at;

/** Zajęte przedziały opiekuna: potwierdzone rezerwacje i spotkania zaplanowane w CRM. */
async function busyFor(db: Db, orgId: string, userId: string, userName: string): Promise<Busy[]> {
  const t = now();
  const rows = await db.all("SELECT start_at, end_at FROM bookings WHERE user_id = ? AND status = 'confirmed' AND end_at > ?", [userId, t]);
  const out: Busy[] = rows.map(r => ({ s: Date.parse(r.start_at), e: Date.parse(r.end_at) }));
  const acts = await db.all("SELECT data FROM records WHERE org_id = ? AND type = 'activity' AND deleted = 0 AND data LIKE '%\"appt\"%'", [orgId]);
  for (const a of acts.map(r => parseJson<any>(r.data, {}))) {
    if (a.type !== 'appt' || a.cancelled || a.bookingId || (a.by && a.by !== userName) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(String(a.at))) continue;
    const s = zoned(a.at.slice(0, 10), a.at.slice(11, 16));
    const e = /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(String(a.end)) ? zoned(a.end.slice(0, 10), a.end.slice(11, 16)) : s + 3600000;
    if (e > Date.now()) out.push({ s, e });
  }
  return out;
}

function shell(title: string, body: string, script = '') {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
:root{--ink:#17181F;--text:#3D3F4C;--mute:#696C7B;--line:#E2E3EA;--line-s:#D4D5DE;--accent:#5B61B8;--accent-h:#4E54AA;--soft:#F3F3FC;--soft2:#E7E8F8;--ok:#2F7D5B}
*{box-sizing:border-box}body{margin:0;background:#F4F4F7;color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:40px auto;padding:0 16px}.card{display:grid;grid-template-columns:300px 1fr;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(24,25,46,.04),0 8px 30px rgba(24,25,46,.05);overflow:hidden}
.side{padding:28px;border-right:1px solid var(--line)}.org{margin:0 0 18px;color:var(--mute);font-size:13px;font-weight:600}.av{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:var(--soft2);color:#3D4290;font-weight:700;margin-bottom:12px}
h1{margin:0 0 4px;color:var(--ink);font:500 26px/1.2 Georgia,"Times New Roman",serif;letter-spacing:-.01em}.who{margin:0 0 16px;color:var(--mute)}.meta{display:grid;gap:8px;margin:0;padding:0;list-style:none;font-size:14px}.meta li{display:flex;gap:8px;align-items:center}.meta svg{flex-shrink:0;color:var(--mute)}.intro{margin:18px 0 0;font-size:14px;white-space:pre-line}
.main{padding:28px;min-height:440px}h2{margin:0 0 14px;color:var(--ink);font-size:16px}.days{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;margin-bottom:22px}
.day,.time{height:auto;padding:10px 8px;border:1px solid var(--line-s);border-radius:10px;background:#fff;color:var(--ink);font:inherit;cursor:pointer;text-align:center;transition:border-color .15s,background .15s}
.day small{display:block;color:var(--mute);font-size:12px;text-transform:capitalize}.day b{font-size:15px}.day:hover,.time:hover{border-color:var(--accent)}.day[aria-pressed=true]{border-color:var(--accent);background:var(--soft);box-shadow:inset 0 0 0 1px var(--accent)}
.times{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}.time{font-weight:600}.time[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}
form{display:grid;gap:12px;margin-top:22px;padding-top:22px;border-top:1px solid var(--line)}label{display:grid;gap:5px;font-size:13px;font-weight:600;color:var(--ink)}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
input,textarea{width:100%;padding:10px 12px;border:1px solid var(--line-s);border-radius:10px;font:inherit;color:var(--ink);background:#fff}input:focus,textarea:focus{outline:0;border-color:#8B90DA;box-shadow:0 0 0 3px var(--soft2)}
.btn{height:46px;padding:0 20px;border:0;border-radius:10px;background:var(--accent);color:#fff;font:600 15px inherit;font-family:inherit;cursor:pointer;justify-self:start}.btn:hover{background:var(--accent-h)}.btn:disabled{opacity:.5;cursor:default}
.ghost{background:#fff;color:var(--ink);border:1px solid var(--line-s)}.hint{color:var(--mute);font-size:13px;margin:0}.err{color:#B4432F;font-size:14px;margin:0}.empty{color:var(--mute)}
.done{text-align:center;padding:30px 10px}.done .ok{width:56px;height:56px;margin:0 auto 14px;display:grid;place-items:center;border-radius:50%;background:#E6F2EC;color:var(--ok)}.done h2{font:500 24px/1.25 Georgia,serif;margin-bottom:8px}.row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px}
.foot{margin:14px 0 0;text-align:center;color:var(--mute);font-size:12px}.foot a{color:inherit}
@media (max-width:760px){.wrap{margin:12px auto}.card{grid-template-columns:1fr}.side{border-right:0;border-bottom:1px solid var(--line);padding:22px}.main{padding:22px;min-height:0}.two{grid-template-columns:1fr}}
</style></head><body><div class="wrap">${body}<p class="foot">Czas polski · Umawianie przez Hermes CRM</p></div>${script}</body></html>`;
}
const ICO = {
  clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  ok: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'H';

function bookingPage(id: string, s: BookingSettings, owner: string, org: string) {
  const side = `<aside class="side"><p class="org">${esc(org)}</p><div class="av">${esc(initials(owner))}</div><h1>${esc(s.title)}</h1><p class="who">${esc(owner)}</p>
<ul class="meta"><li>${ICO.clock}${s.duration} min</li>${s.location ? `<li>${ICO.pin}${esc(s.location)}</li>` : ''}</ul>${s.intro ? `<p class="intro">${esc(s.intro)}</p>` : ''}</aside>`;
  const main = s.active ? `<section class="main" id="app"><h2>Wybierz dzień</h2><div class="days" id="days"><p class="empty">Wczytuję wolne terminy…</p></div><div id="slot"></div></section>`
    : `<section class="main"><h2>Umawianie jest wyłączone</h2><p class="hint">Napisz bezpośrednio do ${esc(owner)}, a ustalicie termin.</p></section>`;
  const script = s.active ? `<script>
(function(){
var ID=${JSON.stringify(id)},D=document,days=[],day=null,time=null;
var fD=new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',weekday:'short'}),fN=new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',day:'numeric',month:'short'}),fT=new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit'}),fL=new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
function e(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function load(msg){fetch('/api/public/booking/'+ID+'/slots').then(function(r){return r.json()}).then(function(j){days=j.days||[];day=days[0]?days[0].day:null;time=null;draw(msg)}).catch(function(){D.getElementById('days').innerHTML='<p class="err">Nie udało się wczytać terminów. Odśwież stronę.</p>'})}
function draw(msg){var el=D.getElementById('days');if(!days.length){el.innerHTML='<p class="empty">Brak wolnych terminów w najbliższym czasie.</p>';D.getElementById('slot').innerHTML='';return}
el.innerHTML=days.map(function(d){var t=new Date(d.day+'T12:00:00Z');return '<button class="day" data-d="'+d.day+'" aria-pressed="'+(d.day===day)+'"><small>'+e(fD.format(t))+'</small><b>'+e(fN.format(t))+'</b></button>'}).join('');
var cur=days.filter(function(d){return d.day===day})[0];
var h='<h2>Wybierz godzinę</h2>'+(msg?'<p class="err" style="margin-bottom:10px">'+e(msg)+'</p>':'')+'<div class="times">'+cur.times.map(function(t){return '<button class="time" data-t="'+t+'" aria-pressed="'+(t===time)+'">'+e(fT.format(new Date(t)))+'</button>'}).join('')+'</div>';
if(time)h+='<form id="f" novalidate><p class="hint">Wybrany termin: <b>'+e(fL.format(new Date(time)))+'</b></p><div class="two"><label>Imię i nazwisko<input name="name" required autocomplete="name" maxlength="120"></label><label>Email<input name="email" type="email" required autocomplete="email" maxlength="160"></label></div><div class="two"><label>Firma<input name="company" autocomplete="organization" maxlength="160"></label><label>Telefon (opcjonalnie)<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label></div><label>O czym chcesz porozmawiać?<textarea name="topic" rows="3" maxlength="1000"></textarea></label><input name="website" tabindex="-1" autocomplete="off" style="display:none"><p class="err" id="er" hidden></p><button class="btn" type="submit">Umów spotkanie</button></form>';
D.getElementById('slot').innerHTML=h}
D.addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b)return;if(b.dataset.d){day=b.dataset.d;time=null;draw()}else if(b.dataset.t){time=b.dataset.t;draw();var n=D.querySelector('#f input[name=name]');if(n)n.focus()}});
D.addEventListener('submit',function(ev){ev.preventDefault();var f=ev.target,er=D.getElementById('er'),btn=f.querySelector('.btn'),o={start:time};['name','email','company','phone','topic','website'].forEach(function(k){o[k]=f.elements[k].value});
if(o.name.trim().length<2||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(o.email.trim())){er.hidden=false;er.textContent='Podaj imię i nazwisko oraz poprawny email.';return}
btn.disabled=true;btn.textContent='Zapisuję…';
fetch('/api/public/booking/'+ID,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o)}).then(function(r){return r.json().then(function(j){return{s:r.status,j:j}})}).then(function(x){
if(x.s===409){load('Ten termin właśnie się zajął. Wybierz inny.');return}
if(x.s!==200){er.hidden=false;er.textContent=x.j.message||'Nie udało się umówić spotkania.';btn.disabled=false;btn.textContent='Umów spotkanie';return}
D.getElementById('app').innerHTML='<div class="done"><div class="ok">${ICO.ok.replace(/"/g, '\\"')}</div><h2>Spotkanie umówione</h2><p>'+e(x.j.when)+'</p><p class="hint">Potwierdzenie z zaproszeniem do kalendarza wysłaliśmy na '+e(o.email)+'.</p><div class="row"><a class="btn" style="display:inline-grid;place-items:center;text-decoration:none" href="'+x.j.icsUrl+'">Dodaj do kalendarza</a><a class="btn ghost" style="display:inline-grid;place-items:center;text-decoration:none" href="'+x.j.cancelUrl+'">Odwołaj</a></div></div>'
}).catch(function(){er.hidden=false;er.textContent='Brak połączenia. Spróbuj ponownie.';btn.disabled=false;btn.textContent='Umów spotkanie'})});
load();
})();
</script>` : '';
  return shell(`${s.title} · ${owner}`, `<div class="card">${side}${main}</div>`, script);
}

export default async function bookingRoutes(app: FastifyInstance) {
  const { db, cfg } = app;
  const pageUrl = (id: string) => `${cfg.publicUrl}/umow/${id}`;
  const cancelUrl = (t: string) => `${cfg.publicUrl}/umow/anuluj/${t}`;
  const icsUrl = (t: string) => `${cfg.publicUrl}/api/public/booking/ics/${t}`;

  /* ---- ustawienia handlowca ---- */
  app.get('/api/booking', async req => {
    const c = need(req);
    const p = await db.one('SELECT id, settings FROM booking_pages WHERE org_id = ? AND user_id = ?', [c.org.id, c.user.id]);
    return { page: p ? { id: p.id, url: pageUrl(p.id), settings: cleanBooking(parseJson(p.settings, {})) } : null, defaults: cleanBooking({}) };
  });
  app.put('/api/booking', async req => {
    const c = need(req);
    if (c.role === 'viewer') throw new HttpError(403, 'read_only', 'Masz dostęp tylko do podglądu.');
    const s = cleanBooking((req.body as any)?.settings);
    const p = await db.one('SELECT id FROM booking_pages WHERE org_id = ? AND user_id = ?', [c.org.id, c.user.id]);
    const id = p?.id || newToken().slice(0, 16), t = now();
    if (p) await db.run('UPDATE booking_pages SET settings = ?, updated_at = ? WHERE id = ?', [JSON.stringify(s), t, id]);
    else {
      await db.run('INSERT INTO booking_pages (id, org_id, user_id, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [id, c.org.id, c.user.id, JSON.stringify(s), t, t]);
      await audit(db, { orgId: c.org.id, userId: c.user.id }, 'booking_page_created', null, null, { id });
    }
    return { page: { id, url: pageUrl(id), settings: s } };
  });
  app.post('/api/bookings/:id/cancel', async req => {
    const c = need(req);
    if (c.role === 'viewer') throw new HttpError(403, 'read_only', 'Masz dostęp tylko do podglądu.');
    const b = await db.one('SELECT * FROM bookings WHERE org_id = ? AND id = ?', [c.org.id, (req.params as any).id]);
    if (!b) throw new HttpError(404, 'not_found', 'Nie ma takiego spotkania.');
    await cancelBooking(b, 'owner');
    return { ok: true };
  });

  /* ---- strona publiczna ---- */
  const pageData = async (id: string) => {
    const p = await db.one('SELECT p.*, u.name AS owner_name, u.email AS owner_email, o.name AS org_name FROM booking_pages p JOIN users u ON u.id = p.user_id JOIN orgs o ON o.id = p.org_id WHERE p.id = ?', [id]);
    return p ? { ...p, s: cleanBooking(parseJson(p.settings, {})) } as any : null;
  };
  const notFound = (reply: any) => reply.status(404).type('text/html; charset=utf-8').send(shell('Nie znaleziono', '<div class="card" style="display:block;padding:32px"><h1>Nie znaleziono</h1><p class="hint">Ten link do umawiania nie istnieje albo jest niepełny.</p></div>'));
  app.get('/umow/:id', async (req, reply) => {
    const p = await pageData((req.params as any).id);
    reply.header('cache-control', 'no-store').header('x-robots-tag', 'noindex');
    if (!p) return notFound(reply);
    return reply.type('text/html; charset=utf-8').send(bookingPage(p.id, p.s, p.owner_name, p.org_name));
  });
  app.get('/api/public/booking/:id/slots', async (req, reply) => {
    const p = await pageData((req.params as any).id);
    if (!p) throw new HttpError(404, 'not_found', 'Nie ma takiej strony.');
    reply.header('cache-control', 'no-store');
    if (!p.s.active) return { days: [] };
    return { days: freeSlots(p.s, await busyFor(db, p.org_id, p.user_id, p.owner_name)), duration: p.s.duration };
  });

  const bookLimit = limiter(10, 60 * 60e3);
  app.post('/api/public/booking/:id', async (req, reply) => {
    const p = await pageData((req.params as any).id);
    if (!p || !p.s.active) throw new HttpError(404, 'not_found', 'Umawianie jest niedostępne.');
    const b = (req.body || {}) as Record<string, unknown>;
    const v = (k: string, max = 200) => (typeof b[k] === 'string' ? String(b[k]).trim().slice(0, max) : '');
    if (v('website')) return { ok: true, when: '', icsUrl: '#', cancelUrl: '#' }; /* pułapka na boty */
    if (!bookLimit(req.ip + '|' + p.id)) throw new HttpError(429, 'too_many', 'Za dużo prób. Spróbuj za godzinę.');
    const name = v('name', 120), email = v('email', 160).toLowerCase(), company = v('company', 160), phone = v('phone', 40), topic = v('topic', 1000), start = v('start', 40);
    if (name.length < 2) throw bad('name', 'Podaj imię i nazwisko.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('email', 'Podaj poprawny adres email.');
    const free = freeSlots(p.s, await busyFor(db, p.org_id, p.user_id, p.owner_name));
    if (!free.some(d => d.times.includes(start))) throw new HttpError(409, 'slot_taken', 'Ten termin nie jest już dostępny.');
    const end = new Date(Date.parse(start) + p.s.duration * 60000).toISOString();
    const id = newId('b_'), token = newToken().slice(0, 32), t = now(), w = warsaw(), at = localAt(start), day = at.slice(0, 10);

    /* CRM: kontakt, firma, rekord nadrzędny, spotkanie i następny krok */
    const recs = (await db.all("SELECT type, data, owner FROM records WHERE org_id = ? AND deleted = 0 AND type IN ('company', 'contact', 'lead', 'deal')", [p.org_id]))
      .map(r => ({ _t: r.type as string, _owner: r.owner as string | null, ...parseJson<any>(r.data, {}) }));
    const low = (s: unknown) => String(s || '').trim().toLowerCase();
    const put: { type: string; data: any; owner: string | null; isNew: boolean }[] = [];
    let person = recs.find(r => r._t === 'contact' && low(r.email) === email);
    let comp = person?.company ? recs.find(r => r._t === 'company' && r.id === person!.company) : undefined;
    if (!comp && company) comp = recs.find(r => r._t === 'company' && low(r.name) === low(company));
    const domain = email.split('@')[1];
    if (!comp && !FREE_MAIL.has(domain)) comp = recs.find(r => r._t === 'company' && low(r.domain).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') === domain);
    if (!comp && company) { comp = { _t: 'company', _owner: null, id: newId('c'), name: company, domain: FREE_MAIL.has(domain) ? '' : domain, created: w.day }; put.push({ type: 'company', data: strip(comp), owner: null, isNew: true }); }
    if (!person) {
      person = { _t: 'contact', _owner: null, id: newId('p'), name, email, phone, company: comp?.id || '', role: '', created: w.day };
      put.push({ type: 'contact', data: strip(person), owner: null, isNew: true });
    } else if (phone && !person.phone) { person.phone = phone; put.push({ type: 'contact', data: strip(person), owner: person._owner, isNew: false }); }
    const linked = (r: any) => (Array.isArray(r.contacts) && r.contacts.includes(person!.id)) || (comp && r.company === comp.id);
    const mine = (r: any) => (r.owner === p.owner_name ? 0 : 1);
    let parentType = 'deal';
    let parent = recs.filter(r => r._t === 'deal' && !CLOSED_DEAL.includes(r.stage) && linked(r)).sort((a, b) => mine(a) - mine(b))[0];
    if (!parent) { parentType = 'lead'; parent = recs.filter(r => r._t === 'lead' && !CLOSED_LEAD.includes(r.status) && linked(r)).sort((a, b) => mine(a) - mine(b))[0]; }
    const step = `${p.s.title}: ${topic ? topic.split('\n')[0].slice(0, 80) : name}`;
    if (!parent) {
      parent = { _t: 'lead', _owner: p.owner_name, id: newId('l'), name: comp?.name || name, company: comp?.id || '', contacts: [person.id], source: 'Kalendarz', status: 'Nowy', statusAt: w.day, icp: '', disqReason: '', dealId: '', value: 0, owner: p.owner_name, nextStep: step, nextDate: day, created: w.day };
      put.push({ type: 'lead', data: strip(parent), owner: p.owner_name, isNew: true });
    } else {
      if (Array.isArray(parent.contacts) && !parent.contacts.includes(person.id)) parent.contacts = [...parent.contacts, person.id];
      if (!parent.nextStep || !parent.nextDate || parent.nextDate > day) { parent.nextStep = step; parent.nextDate = day; }
      put.push({ type: parentType, data: strip(parent), owner: parent._owner, isNew: false });
    }
    const act = { id: newId('a'), obj: parentType, rid: parent.id, type: 'appt', who: person.id, text: `${p.s.title}${topic ? ': ' + topic : ''}`, at, end: localAt(end), by: p.owner_name, location: p.s.location, via: 'booking', bookingId: id };
    put.push({ type: 'activity', data: act, owner: null, isNew: true });
    put.push({ type: 'activity', data: { id: newId('a'), obj: parentType, rid: parent.id, type: 'system', text: `${name} umówił(a) spotkanie przez link: ${whenLabel(start, end)}`, at: w.at }, owner: null, isNew: true });

    try {
      await db.tx(async tx => {
        await tx.run('INSERT INTO bookings (id, org_id, page_id, user_id, start_at, end_at, name, email, company, phone, topic, status, cancel_token, contact_id, record_obj, record_id, activity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, p.org_id, p.id, p.user_id, start, end, name, email, company, phone, topic, 'confirmed', token, person!.id, parentType, parent!.id, act.id, t]);
        for (const r of put) {
          if (r.isNew) await tx.run('INSERT INTO records (org_id, type, id, data, owner, updated_at, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [p.org_id, r.type, r.data.id, JSON.stringify(r.data), r.owner, t, null]);
          else await tx.run('UPDATE records SET data = ?, updated_at = ?, updated_by = NULL WHERE org_id = ? AND type = ? AND id = ?', [JSON.stringify(r.data), t, p.org_id, r.type, r.data.id]);
        }
        await audit(tx, { orgId: p.org_id }, 'meeting_booked', parentType, parent!.id, { name: parent!.name, start });
      });
    } catch (e: any) {
      if (/unique|duplicate/i.test(String(e?.message))) throw new HttpError(409, 'slot_taken', 'Ten termin nie jest już dostępny.');
      throw e;
    }
    const when = whenLabel(start, end);
    const invite = (cancel = false) => ics({ uid: id, start, end, title: `${p.s.title}: ${name} i ${p.owner_name}`, description: [topic, `Odwołanie: ${cancelUrl(token)}`].filter(Boolean).join('\n\n'), location: p.s.location, organizer: { name: p.owner_name, email: p.owner_email }, attendee: { name, email }, cancel });
    const att = [{ filename: 'spotkanie.ics', content: invite(), contentType: 'text/calendar; charset=utf-8; method=REQUEST' }];
    void app.mail.send({ to: email, subject: `Potwierdzenie spotkania: ${when}`, attachments: att, ...layout([`Dzień dobry ${name.split(' ')[0]},`, `potwierdzamy spotkanie „${p.s.title}” z ${p.owner_name} (${p.org_name}).`, `Termin: ${when}.`, p.s.location ? `Miejsce: ${p.s.location}.` : '', 'Zaproszenie do kalendarza jest w załączniku.'].filter(Boolean), { label: 'Odwołaj spotkanie', url: cancelUrl(token) }) }).catch(() => {});
    void app.mail.send({ to: p.owner_email, subject: `Nowe spotkanie: ${name}, ${when}`, attachments: att, ...layout([`${name}${company ? ' (' + company + ')' : ''} umówił(a) spotkanie przez Twój link.`, `Termin: ${when}.`, topic ? `Temat: ${topic}` : '', `Hermes zapisał spotkanie w CRM ${parentType === 'deal' ? 'przy szansie' : 'przy leadzie'} „${parent.name}”.`].filter(Boolean), { label: 'Otwórz Hermesa', url: cfg.publicUrl + '/' }) }).catch(() => {});
    void dispatch(app, p.org_id, [{ event: 'meeting.booked', data: { ...act, start, end, contact: { name, email, phone, company }, record: { type: parentType, id: parent.id, name: parent.name } } }]).catch(() => {});
    return reply.send({ ok: true, when, icsUrl: icsUrl(token), cancelUrl: cancelUrl(token) });
  });

  app.get('/api/public/booking/ics/:token', async (req, reply) => {
    const b = await db.one('SELECT b.*, p.settings, u.name AS owner_name, u.email AS owner_email FROM bookings b JOIN booking_pages p ON p.id = b.page_id JOIN users u ON u.id = b.user_id WHERE b.cancel_token = ?', [(req.params as any).token]);
    if (!b) throw new HttpError(404, 'not_found', 'Nie ma takiego spotkania.');
    const s = cleanBooking(parseJson(b.settings, {}));
    return reply.type('text/calendar; charset=utf-8').header('content-disposition', 'attachment; filename="spotkanie.ics"')
      .send(ics({ uid: b.id, start: b.start_at, end: b.end_at, title: `${s.title}: ${b.name} i ${b.owner_name}`, description: b.topic || '', location: s.location, organizer: { name: b.owner_name, email: b.owner_email }, attendee: { name: b.name, email: b.email }, cancel: b.status === 'cancelled' }));
  });

  /** Odwołanie przez klienta (link z maila) albo przez handlowca (z CRM): rezerwacja, spotkanie w CRM, następny krok, maile. */
  async function cancelBooking(b: any, by: 'client' | 'owner') {
    if (b.status !== 'confirmed') return false;
    const t = now(), w = warsaw();
    const owner = await db.one('SELECT name, email FROM users WHERE id = ?', [b.user_id]);
    const page = await db.one('SELECT settings FROM booking_pages WHERE id = ?', [b.page_id]);
    const s = cleanBooking(parseJson(page?.settings, {}));
    const when = whenLabel(b.start_at, b.end_at);
    await db.tx(async tx => {
      await tx.run("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'confirmed'", [b.id]);
      const a = await tx.one("SELECT data FROM records WHERE org_id = ? AND type = 'activity' AND id = ?", [b.org_id, b.activity_id]);
      if (a) await tx.run("UPDATE records SET data = ?, updated_at = ? WHERE org_id = ? AND type = 'activity' AND id = ?", [JSON.stringify({ ...parseJson<any>(a.data, {}), cancelled: true }), t, b.org_id, b.activity_id]);
      const r = await tx.one('SELECT data FROM records WHERE org_id = ? AND type = ? AND id = ? AND deleted = 0', [b.org_id, b.record_obj, b.record_id]);
      if (r) {
        const d = parseJson<any>(r.data, {});
        if (String(d.nextStep || '').startsWith(s.title + ':') && d.nextDate === localAt(b.start_at).slice(0, 10)) {
          d.nextStep = 'Ustalić nowy termin spotkania'; d.nextDate = w.day;
          await tx.run('UPDATE records SET data = ?, updated_at = ? WHERE org_id = ? AND type = ? AND id = ?', [JSON.stringify(d), t, b.org_id, b.record_obj, b.record_id]);
        }
      }
      const id = newId('a');
      await tx.run('INSERT INTO records (org_id, type, id, data, owner, updated_at, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)', [b.org_id, 'activity', id, JSON.stringify({ id, obj: b.record_obj, rid: b.record_id, type: 'system', text: `${by === 'client' ? b.name + ' odwołał(a)' : 'Odwołano'} spotkanie: ${when}`, at: w.at }), null, t, null]);
      await audit(tx, { orgId: b.org_id }, 'meeting_cancelled', b.record_obj, b.record_id, { start: b.start_at, by });
    });
    const att = owner ? [{ filename: 'odwolanie.ics', content: ics({ uid: b.id, start: b.start_at, end: b.end_at, title: `${s.title}: ${b.name} i ${owner.name}`, organizer: { name: owner.name, email: owner.email }, attendee: { name: b.name, email: b.email }, cancel: true }), contentType: 'text/calendar; charset=utf-8; method=CANCEL' }] : [];
    if (by === 'client' && owner) void app.mail.send({ to: owner.email, subject: `Odwołane spotkanie: ${b.name}, ${when}`, attachments: att, ...layout([`${b.name} odwołał(a) spotkanie zaplanowane na ${when}.`, 'Hermes ustawił następny krok: ustalić nowy termin spotkania.'], { label: 'Otwórz Hermesa', url: cfg.publicUrl + '/' }) }).catch(() => {});
    if (by === 'owner' && owner) void app.mail.send({ to: b.email, subject: `Odwołane spotkanie: ${when}`, attachments: att, ...layout([`Dzień dobry ${String(b.name).split(' ')[0]},`, `${owner.name} odwołał(a) spotkanie zaplanowane na ${when}. Odezwiemy się, żeby ustalić nowy termin.`]) }).catch(() => {});
    void dispatch(app, b.org_id, [{ event: 'meeting.cancelled', data: { bookingId: b.id, start: b.start_at, end: b.end_at, by, contact: { name: b.name, email: b.email }, record: { type: b.record_obj, id: b.record_id } } }]).catch(() => {});
    return true;
  }

  app.get('/umow/anuluj/:token', async (req, reply) => {
    const b = await db.one('SELECT b.*, u.name AS owner_name FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.cancel_token = ?', [(req.params as any).token]);
    reply.header('cache-control', 'no-store').header('x-robots-tag', 'noindex');
    if (!b) return notFound(reply);
    const when = whenLabel(b.start_at, b.end_at);
    const body = b.status !== 'confirmed' ? `<div class="card" style="display:block;padding:32px"><h1>Spotkanie odwołane</h1><p class="hint">Termin ${esc(when)} jest już odwołany.</p></div>`
      : Date.parse(b.start_at) < Date.now() ? `<div class="card" style="display:block;padding:32px"><h1>Spotkanie już się odbyło</h1><p class="hint">${esc(when)}</p></div>`
      : `<div class="card" style="display:block;padding:32px"><h1>Odwołać spotkanie?</h1><p>${esc(when)} z ${esc(b.owner_name)}.</p><form method="post" action="/api/public/booking/cancel/${esc(b.cancel_token)}" style="border:0;padding:0;margin-top:18px"><button class="btn" type="submit">Odwołaj spotkanie</button></form></div>`;
    return reply.type('text/html; charset=utf-8').send(shell('Odwołanie spotkania', body));
  });
  const cancelLimit = limiter(20, 60 * 60e3);
  app.post('/api/public/booking/cancel/:token', async (req, reply) => {
    if (!cancelLimit(req.ip)) throw new HttpError(429, 'too_many', 'Za dużo prób. Spróbuj za godzinę.');
    const b = await db.one('SELECT * FROM bookings WHERE cancel_token = ?', [(req.params as any).token]);
    if (!b) throw new HttpError(404, 'not_found', 'Nie ma takiego spotkania.');
    if (Date.parse(b.start_at) < Date.now()) throw new HttpError(409, 'past', 'To spotkanie już się odbyło.');
    await cancelBooking(b, 'client');
    const json = String(req.headers['content-type'] || '').includes('json');
    if (json) return { ok: true };
    return reply.type('text/html; charset=utf-8').send(shell('Spotkanie odwołane', `<div class="card" style="display:block;padding:32px"><h1>Spotkanie odwołane</h1><p class="hint">Daliśmy znać organizatorowi. Nowy termin możesz wybrać pod tym samym linkiem do umawiania.</p></div>`));
  });
}
function strip(r: any) { const { _t, _owner, ...d } = r; return d; }
