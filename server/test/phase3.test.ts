// Faza 3: webhooki wychodzące z podpisem, automatyzacje dla leadów z formularza, oferty z akceptacją, raport tygodniowy.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { freshApp, client, owner } from './helpers.js';
import { memoryMailer } from '../src/mail.js';
import { runWeekly, lastWeek, weekStats } from '../src/reports.js';
import { totals } from '../src/routes-offers.js';

const mail = memoryMailer();
const env = await freshApp({}, { mailer: mail });
after(() => env.close());
const A = client(env.app);
await A.post('/api/auth/register', owner);
const got: { url: string; body: any; sig: string; event: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  if (String(url).startsWith('https://hooks.test/')) { got.push({ url: String(url), body: JSON.parse(init.body), sig: init.headers['x-hermes-signature'], event: init.headers['x-hermes-event'] }); return new Response('ok', { status: 200 }); }
  return realFetch(url, init);
}) as typeof fetch;
const settle = () => new Promise(r => setTimeout(r, 60));

test('webhooki: zdarzenia z synchronizacji z podpisem HMAC', async () => {
  assert.equal((await A.post('/api/org/webhooks', { url: 'ftp://x', events: ['deal.won'] })).status, 400);
  const h = await A.post('/api/org/webhooks', { url: 'https://hooks.test/zapier', events: ['deal.created', 'deal.won', 'lead.created'] });
  assert.equal(h.status, 200);
  await A.post('/api/sync', { upserts: [
    { type: 'company', id: 'c1', data: { id: 'c1', name: 'Alfa' } },
    { type: 'deal', id: 'd1', data: { id: 'd1', name: 'Wdrożenie', company: 'c1', stage: 'Oferta', value: 10000, owner: owner.name } }
  ] });
  await settle();
  assert.equal(got.length, 1);
  assert.equal(got[0].event, 'deal.created');
  assert.equal(got[0].body.data.company_name, 'Alfa');
  const expect = 'sha256=' + crypto.createHmac('sha256', h.json.secret).update(JSON.stringify(got[0].body)).digest('hex');
  assert.equal(got[0].sig, expect, 'podpis zgodny z sekretem');
  await A.post('/api/sync', { upserts: [{ type: 'deal', id: 'd1', data: { id: 'd1', name: 'Wdrożenie', company: 'c1', stage: 'Wygrana', value: 10000, owner: owner.name, closedAt: '2026-10-27' } }] });
  await settle();
  assert.deepEqual(got.slice(1).map(g => g.event), ['deal.won'], 'zmiana etapu bez subskrypcji nie wychodzi, wygrana tak');
  const list = await A.get('/api/org/webhooks');
  assert.equal(list.json.webhooks[0].last_status, 200);
});

test('automatyzacje: przydział po kolei i zadanie dla leada z formularza', async () => {
  const inv = await A.post('/api/org/invites', { email: 'monika@przewaga.pl', role: 'sales' });
  await client(env.app).post(`/api/invites/${new URL(inv.json.link).searchParams.get('invite')}/accept`, { name: 'Monika Nowak', password: 'haslomoniki1' });
  await A.post('/api/sync', { settings: { rules: [
    { id: 'r1', on: 'lead', do: 'owner', owner: '__rr' },
    { id: 'r2', on: 'lead', source: 'Strona www', do: 'task', title: 'Zadzwonić w ciągu godziny', days: 0 }
  ] } });
  const f = await A.post('/api/org/forms');
  const url = new URL(f.json.url).pathname;
  await env.app.inject({ method: 'POST', url, payload: { name: 'Jan Kos', email: 'jan@kos.pl' } });
  await env.app.inject({ method: 'POST', url, payload: { name: 'Ewa Lis', email: 'ewa@lis.pl' } });
  const st = (await A.get('/api/state')).json.db;
  assert.deepEqual(st.lead.map((l: any) => l.owner).sort(), [owner.name, 'Monika Nowak'].sort(), 'leady rozdzielone po kolei');
  assert.equal(st.task.filter((t: any) => t.auto && t.title === 'Zadzwonić w ciągu godziny').length, 2);
  await settle();
  assert.ok(got.some(g => g.event === 'lead.created'), 'lead z formularza wysyła webhook');
});

test('oferty: pozycje, strona dla klienta, akceptacja i powiadomienie', async () => {
  const t = totals([{ name: 'Licencja', qty: 5, unit: 'szt.', price: 100, discount: 10, vat: 23 }, { name: 'Szkolenie', qty: 1, unit: 'usł.', price: 1000, discount: 0, vat: -1 }]);
  assert.deepEqual([t.net, t.vat, t.gross], [1450, 103.5, 1553.5]);
  await A.post('/api/sync', { settings: { offer: { seller: 'Przewaga Sp. z o.o.', details: 'ul. Prosta 1, Warszawa', prefix: 'PRZ', validDays: 7 } } });
  assert.equal((await A.post('/api/offers', { dealId: 'd1', items: [] })).status, 400);
  const o = await A.post('/api/offers', { dealId: 'd1', buyer: { name: 'Alfa' }, items: [{ name: 'Licencja', qty: 5, price: 100, discount: 10, vat: 23 }] });
  assert.equal(o.status, 200);
  assert.match(o.json.number, /^PRZ\/\d{4}\/\d{2}\/001$/);
  const path = new URL(o.json.url).pathname;
  const page = await env.app.inject({ method: 'GET', url: path });
  assert.equal(page.statusCode, 200);
  assert.ok(page.body.includes('Przewaga Sp. z o.o.') && page.body.includes('450,00') && page.body.includes('Akceptuję ofertę'));
  const id = path.split('/').pop();
  const acc = await env.app.inject({ method: 'POST', url: `/api/public/offers/${id}/accept`, headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: 'name=Anna+Nowak' });
  assert.equal(acc.statusCode, 200);
  assert.ok(acc.body.includes('Dziękujemy, Anna Nowak'));
  assert.equal((await env.app.inject({ method: 'POST', url: `/api/public/offers/${id}/accept`, payload: { name: 'Ktoś' } })).statusCode, 409, 'drugi raz nie');
  const list = await A.get('/api/offers?deal=d1');
  assert.equal(list.json.offers[0].status, 'accepted');
  assert.ok(list.json.offers[0].viewed_at, 'otwarcie oferty zapisane');
  const acts = (await A.get('/api/state')).json.db.activity.filter((a: any) => a.rid === 'd1').map((a: any) => a.text);
  assert.ok(acts.some((x: string) => x.startsWith('Klient otworzył ofertę')) && acts.some((x: string) => x.startsWith('Klient zaakceptował ofertę')));
  assert.ok(mail.outbox.some(m => m.subject.includes('zaakceptowana')));
  assert.equal((await env.app.inject({ method: 'GET', url: '/oferta/nieistnieje' })).statusCode, 404);
});

test('raport tygodniowy dla administratora', async () => {
  const w = lastWeek(new Date('2026-11-02T09:00:00Z'));
  assert.deepEqual([w.from, w.to], ['2026-10-26', '2026-11-01']);
  const s = weekStats([{ _t: 'deal', id: 'd1', owner: 'A', stage: 'Wygrana', value: 5000, closedAt: '2026-10-28', created: '2026-10-01' }, { _t: 'lead', id: 'l1', owner: 'A', created: '2026-10-30' }], w.from, w.to);
  assert.equal(s.wonValue, 5000); assert.equal(s.newLeads, 1);
  const before = mail.outbox.length;
  assert.equal(await runWeekly(env.app, new Date('2026-11-02T08:30:00Z')), 1);
  assert.match(mail.outbox.at(-1)!.subject, /1 wygrana/);
  assert.equal(await runWeekly(env.app, new Date('2026-11-02T08:30:00Z')), 0, 'raz w tygodniu');
  assert.equal(mail.outbox.length, before + 1);
});
