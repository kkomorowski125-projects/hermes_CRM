// Testy fazy 2: NIP z Białej listy (podstawiona odpowiedź), formularz leada, zadania i poranny plan mailem.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { freshApp, client, owner } from './helpers.js';
import { memoryMailer } from '../src/mail.js';
import { runDigest, nipValid, prettyName, cityOf, warsaw } from '../src/routes-growth.js';

const mail = memoryMailer();
const env = await freshApp({ nipApi: 'https://mf.test' }, { mailer: mail });
after(() => env.close());
const A = client(env.app);
await A.post('/api/auth/register', owner);

const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const u = String(url);
  if (!u.startsWith('https://mf.test/')) return realFetch(url, init);
  if (u.includes('/5260250995')) return new Response(JSON.stringify({ result: { subject: { name: 'ALFA SOFT SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', nip: '5260250995', statusVat: 'Czynny', regon: '012345678', krs: '0000123456', workingAddress: 'UL. PROSTA 18, 00-850 WARSZAWA' } } }), { status: 200 });
  return new Response(JSON.stringify({ result: { subject: null } }), { status: 200 });
}) as typeof fetch;

test('NIP: suma kontrolna, nazwa i miasto z rejestru', async () => {
  assert.equal(nipValid('5260250995'), true);
  assert.equal(nipValid('5260250996'), false);
  assert.equal(prettyName('ALFA SOFT SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ'), 'Alfa Soft Sp. z o.o.');
  assert.equal(cityOf('UL. PROSTA 18, 00-850 WARSZAWA'), 'Warszawa');
  const r = await A.get('/api/nip/526-025-09-95');
  assert.equal(r.status, 200);
  assert.equal(r.json.name, 'Alfa Soft Sp. z o.o.');
  assert.equal(r.json.city, 'Warszawa');
  assert.equal(r.json.address, 'ul. Prosta 18, 00-850 Warszawa');
  assert.equal((await A.get('/api/nip/1234567890')).status, 400);
  assert.equal((await A.get('/api/nip/7740001454')).status, 404);
  assert.equal((await client(env.app).get('/api/nip/5260250995')).status, 401);
});

test('formularz leada: firma, kontakt, lead i notatka bez logowania', async () => {
  const f = await A.post('/api/org/forms');
  assert.equal(f.status, 200);
  const url = new URL(f.json.url).pathname;
  const json = await env.app.inject({ method: 'POST', url, payload: { name: 'Anna Kowalska', email: 'anna@beta.pl', phone: '501 200 300', company: 'Beta', message: 'Proszę o ofertę na 5 osób' } });
  assert.equal(json.statusCode, 200);
  assert.equal(json.headers['access-control-allow-origin'], '*');
  const form = await env.app.inject({ method: 'POST', url, headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html' }, payload: 'name=Jan+Lis&email=anna%40beta.pl&company=beta&redirect=https%3A%2F%2Fbeta.pl%2Fdzieki' });
  assert.equal(form.statusCode, 303);
  assert.equal(form.headers.location, 'https://beta.pl/dzieki');
  const bot = await env.app.inject({ method: 'POST', url, payload: { name: 'Bot', website: 'spam.pl' } });
  assert.equal(bot.statusCode, 200);
  const st = (await A.get('/api/state')).json.db;
  assert.equal(st.lead.length, 2, 'bot nie tworzy leada');
  assert.equal(st.company.length, 1, 'ta sama firma nie dubluje się');
  assert.equal(st.contact.length, 1, 'ten sam email nie dubluje kontaktu');
  assert.equal(st.lead[0].source, 'Strona www');
  assert.equal(st.lead[0].owner, owner.name);
  assert.ok(st.activity.some((a: any) => a.text.includes('Proszę o ofertę')));
  assert.equal((await env.app.inject({ method: 'POST', url: '/api/public/forms/nieznany', payload: { name: 'X' } })).statusCode, 404);
  assert.equal((await A.post('/api/org/forms')).status, 200);
  assert.equal((await A.get('/api/org/forms')).json.forms.length, 2);
});

test('zadania i poranny plan dnia mailem', async () => {
  const day = warsaw().day;
  const st = (await A.get('/api/state')).json.db;
  const lead = st.lead[0];
  await A.post('/api/sync', { upserts: [
    { type: 'task', id: 't1', data: { id: 't1', obj: 'lead', rid: lead.id, title: 'Wysłać cennik', due: day, owner: owner.name } },
    { type: 'task', id: 't2', data: { id: 't2', obj: 'lead', rid: lead.id, title: 'Zrobione wcześniej', due: day, done: day, owner: owner.name } }
  ] });
  assert.equal((await A.get('/api/state')).json.db.task.length, 2, 'zadania synchronizują się jak inne rekordy');
  const before = mail.outbox.length;
  assert.equal(await runDigest(env.app), 1);
  const m = mail.outbox.at(-1)!;
  assert.equal(m.to, owner.email);
  assert.ok(m.text.includes('Wysłać cennik') && !m.text.includes('Zrobione wcześniej'));
  assert.ok(m.text.includes('Odpowiedzieć na zapytanie ze strony'), 'kroki leadów też są w planie');
  assert.equal(await runDigest(env.app), 0, 'raz dziennie');
  assert.equal(mail.outbox.length, before + 1);
});
