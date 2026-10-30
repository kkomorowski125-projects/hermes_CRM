// Testy API: konta, 2FA, zespoły, uprawnienia, synchronizacja, eksport i import, RODO, AI.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { freshApp, client, owner } from './helpers.js';
import { totpCode } from '../src/security.js';

const env = await freshApp({ aiDailyLimit: 2, anthropicKey: 'test-key' });
after(() => env.close());
const A = client(env.app);
const tokenOf = (link: string, k: string) => new URL(link).searchParams.get(k)!;

test('rejestracja firmy i sesja', async () => {
  assert.equal((await A.post('/api/auth/register', { ...owner, password: 'krotkie' })).status, 400);
  const r = await A.post('/api/auth/register', owner);
  assert.equal(r.status, 200);
  const s = await A.get('/api/session');
  assert.equal(s.json.role, 'admin');
  assert.equal(s.json.org.name, 'Przewaga');
  assert.equal((await client(env.app).post('/api/auth/register', owner)).status, 409);
});

test('ochrona przed CSRF i brak sesji', async () => {
  assert.equal((await A.raw('POST', '/api/sync', {}, {})).status, 403);
  assert.equal((await client(env.app).get('/api/state')).status, 401);
});

test('synchronizacja, stan i zmiany od innych', async () => {
  const s0 = await A.get('/api/state');
  const r = await A.post('/api/sync', {
    upserts: [
      { type: 'company', id: 'c1', data: { id: 'c1', name: 'Meble Dębowe' } },
      { type: 'contact', id: 'p1', data: { id: 'p1', name: 'Jan Dąb', company: 'c1' } },
      { type: 'deal', id: 'd1', data: { id: 'd1', name: 'Salon', company: 'c1', contacts: ['p1'], owner: owner.name, stage: 'Oferta', value: 54000 } },
      { type: 'activity', id: 'a1', data: { id: 'a1', obj: 'deal', rid: 'd1', type: 'call', text: 'Rozmowa', at: '2026-10-30T10:00', who: 'p1' } },
      { type: 'company', id: 'bad', data: { id: 'inne' } }
    ],
    settings: { target: 80000, stages: [{ name: 'Nowe', prob: 10 }] }, prefs: { aLayout: [{ id: 'kpis', w: 12 }] }
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.rejected.map((x: any) => x.reason), ['invalid']);
  const s = await A.get('/api/state');
  assert.equal(s.json.db.deal[0].value, 54000);
  assert.equal(s.json.settings.target, 80000);
  assert.deepEqual(s.json.settings.aLayout, [{ id: 'kpis', w: 12 }]);
  const ch = await A.get('/api/changes?since=' + encodeURIComponent(s0.json.cursor));
  assert.ok(ch.json.changes.some((c: any) => c.id === 'd1'));
  await A.post('/api/sync', { deletes: [{ type: 'company', id: 'c1' }] });
  const ch2 = await A.get('/api/changes?since=' + encodeURIComponent(s.json.cursor));
  assert.ok(ch2.json.changes.some((c: any) => c.id === 'c1' && c.data === null), 'usunięcie widać w zmianach');
  await A.post('/api/sync', { upserts: [{ type: 'company', id: 'c1', data: { id: 'c1', name: 'Meble Dębowe' } }] });
});

let B: ReturnType<typeof client>, monikaId = '';
test('zaproszenie, role i widoczność tylko swoich rekordów', async () => {
  const inv = await A.post('/api/org/invites', { email: 'monika@przewaga.pl', role: 'sales' });
  const t = tokenOf(inv.json.link, 'invite');
  B = client(env.app);
  assert.equal((await B.get('/api/invites/' + t)).json.org, 'Przewaga');
  assert.equal((await B.post(`/api/invites/${t}/accept`, { name: 'Monika Nowak', password: 'haslomoniki1' })).status, 200);
  assert.equal((await B.post(`/api/invites/${t}/accept`, { name: 'X', password: 'haslomoniki1' })).status, 404, 'zaproszenie jednorazowe');
  const s = await B.get('/api/session');
  assert.equal(s.json.role, 'sales'); monikaId = s.json.user.id;
  assert.equal(s.json.members.length, 2);
  // handlowiec widzi wszystko, dopóki administrator nie ograniczy widoczności
  assert.equal((await B.get('/api/state')).json.db.deal.length, 1);
  assert.equal((await B.post('/api/org/invites', { email: 'x@y.pl' })).status, 403, 'tylko administrator zaprasza');
  await A.patch('/api/org/members/' + monikaId, { visibility: 'own', target: 40000, title: 'Account manager' });
  const st = await B.get('/api/state');
  assert.equal(st.json.db.deal.length, 0, 'cudza szansa ukryta');
  assert.equal(st.json.db.activity.length, 0, 'historia cudzej szansy ukryta');
  assert.equal(st.json.db.company.length, 1, 'firmy widoczne');
  const r = await B.post('/api/sync', { upserts: [
    { type: 'deal', id: 'd1', data: { id: 'd1', name: 'Przejęta', owner: 'Monika Nowak' } },
    { type: 'deal', id: 'd2', data: { id: 'd2', name: 'Moja', owner: 'Monika Nowak', stage: 'Nowe' } }
  ] });
  assert.deepEqual(r.json.rejected, [{ type: 'deal', id: 'd1', reason: 'not_owner' }]);
  assert.equal((await A.get('/api/state')).json.db.deal.length, 2);
});

test('podgląd: tylko odczyt', async () => {
  const inv = await A.post('/api/org/invites', { email: 'ksiegowa@przewaga.pl', role: 'viewer' });
  const V = client(env.app);
  await V.post(`/api/invites/${tokenOf(inv.json.link, 'invite')}/accept`, { name: 'Ola Lis', password: 'haslooli1234' });
  assert.equal((await V.get('/api/state')).status, 200);
  assert.equal((await V.post('/api/sync', { upserts: [] })).status, 403);
});

test('ostatni administrator i usunięcie członka z przekazaniem rekordów', async () => {
  const me = (await A.get('/api/session')).json.user.id;
  assert.equal((await A.patch('/api/org/members/' + me, { role: 'sales' })).status, 400);
  const r = await A.del('/api/org/members/' + monikaId);
  assert.equal(r.status, 200); assert.equal(r.json.moved, 1);
  const d2 = (await A.get('/api/state')).json.db.deal.find((d: any) => d.id === 'd2');
  assert.equal(d2.owner, owner.name);
  assert.equal((await B.get('/api/state')).status, 401, 'sesja usuniętej osoby wygasa');
});

test('logowanie, limit prób i weryfikacja dwuetapowa', async () => {
  const C = client(env.app);
  assert.equal((await C.post('/api/auth/login', { email: owner.email, password: 'zle-haslo' })).status, 401);
  assert.equal((await C.post('/api/auth/login', { email: owner.email, password: owner.password })).status, 200);
  const setup = await C.post('/api/auth/2fa/setup');
  assert.match(setup.json.uri, /^otpauth:\/\/totp\//);
  assert.equal((await C.post('/api/auth/2fa/enable', { code: '000000' })).status, 400);
  assert.equal((await C.post('/api/auth/2fa/enable', { code: totpCode(setup.json.secret) })).status, 200);
  const D = client(env.app);
  const r1 = await D.post('/api/auth/login', { email: owner.email, password: owner.password });
  assert.equal(r1.json.error, 'totp_required');
  assert.equal((await D.post('/api/auth/login', { email: owner.email, password: owner.password, code: totpCode(setup.json.secret) })).status, 200);
  assert.equal((await D.post('/api/auth/2fa/disable', { password: owner.password })).status, 200);
});

test('reset hasła linkiem', async () => {
  const r = await client(env.app).post('/api/auth/reset/request', { email: owner.email });
  const t = tokenOf(r.json.link, 'reset');
  assert.equal((await client(env.app).post('/api/auth/reset/confirm', { token: t, password: 'nowehaslo12345' })).status, 200);
  assert.equal((await client(env.app).post('/api/auth/reset/confirm', { token: t, password: 'nowehaslo12345' })).status, 400, 'link jednorazowy');
  assert.equal((await A.get('/api/session')).status, 401, 'reset kończy sesje');
  assert.equal((await A.post('/api/auth/login', { email: owner.email, password: 'nowehaslo12345' })).status, 200);
});

test('RODO: eksport i usunięcie danych osoby', async () => {
  const ex = await A.get('/api/gdpr/contacts/p1');
  assert.equal(ex.json.contact.name, 'Jan Dąb');
  assert.equal(ex.json.activity.length, 1);
  const er = await A.del('/api/gdpr/contacts/p1');
  assert.equal(er.status, 200);
  const s = (await A.get('/api/state')).json.db;
  assert.equal(s.contact.length, 0);
  assert.deepEqual(s.deal.find((d: any) => d.id === 'd1').contacts, []);
  assert.equal(s.activity[0].who, undefined);
  const audit = await A.get('/api/audit');
  assert.ok(audit.json.entries.some((e: any) => e.action === 'gdpr_erase'));
});

test('eksport i import kopii zapasowej', async () => {
  const ex = await A.get('/api/export');
  assert.equal(ex.json.app, 'hermes-crm');
  const backup = { app: 'hermes-crm', v: 3, db: { company: [{ id: 'c9', name: 'Z kopii' }], contact: [], lead: [{ id: 'l9', name: 'Lead z kopii', status: 'Nowy', owner: owner.name }], deal: [], activity: [] }, settings: { target: 120000 }, labels: {}, custom: {} };
  const r = await A.post('/api/import', backup);
  assert.equal(r.json.records, 2);
  const s = await A.get('/api/state');
  assert.ok(s.json.db.company.some((c: any) => c.id === 'c9'));
  assert.equal(s.json.settings.target, 120000);
});

test('Hermes AI przez serwer z dziennym limitem', async () => {
  const real = globalThis.fetch;
  let sentKey = '';
  globalThis.fetch = (async (_u: any, init: any) => { sentKey = init.headers['x-api-key']; return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Cześć' }] }), { status: 200 }); }) as any;
  try {
    const r = await A.post('/api/ai/messages', { system: 'test', messages: [{ role: 'user', content: 'Hej' }] });
    assert.equal(r.json.text, 'Cześć'); assert.equal(sentKey, 'test-key');
    await A.post('/api/ai/messages', { messages: [{ role: 'user', content: 'Hej' }] });
    const r3 = await A.post('/api/ai/messages', { messages: [{ role: 'user', content: 'Hej' }] });
    assert.equal(r3.status, 429);
    assert.equal((await A.get('/api/ai/status')).json.used, 2);
  } finally { globalThis.fetch = real; }
});

test('aplikacja pod / i stan zdrowia', async () => {
  const r = await client(env.app).get('/');
  assert.equal(r.status, 200); assert.match(r.body, /<title>Hermes CRM<\/title>/);
  assert.equal((await client(env.app).get('/health')).json.ok, true);
});
