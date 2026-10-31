// Maile w historii przez BCC i seria powitalna.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { freshApp, client, owner } from './helpers.js';
import { memoryMailer } from '../src/mail.js';
import { parseAddrs, cleanBody } from '../src/routes-inbound.js';
import { runOnboarding } from '../src/onboarding.js';

const mail = memoryMailer();
const env = await freshApp({ inboundDomain: 'in.hermes.test', inboundSecret: 'tajny-sekret-123' }, { mailer: mail });
after(() => env.close());
const A = client(env.app);
await A.post('/api/auth/register', owner);
const hook = (body: unknown, secret = 'tajny-sekret-123') => env.app.inject({ method: 'POST', url: `/api/public/inbound/${secret}`, payload: body as any });

test('pomocnicze: adresy i treść bez cytatu', () => {
  assert.deepEqual(parseAddrs('"Nowak, Anna" <Anna@Alfa.pl>, bok@beta.pl'), [{ name: 'Nowak, Anna', email: 'anna@alfa.pl' }, { name: '', email: 'bok@beta.pl' }]);
  assert.equal(cleanBody('Dziękuję za ofertę.\n\nW dniu 30.10.2026 Jan Kos napisał:\n> stara treść'), 'Dziękuję za ofertę.');
});

test('BCC: adres firmy, mail do klienta zapisany w historii, nowy kontakt z firmą po domenie', async () => {
  assert.equal((await A.get('/api/org/mailbox')).json.enabled, true);
  const box = (await A.post('/api/org/mailbox')).json.address as string;
  assert.match(box, /^hermes-[0-9a-f]{12}@in\.hermes\.test$/);
  await A.post('/api/sync', { upserts: [
    { type: 'company', id: 'c1', data: { id: 'c1', name: 'Alfa Soft', domain: 'https://www.alfa.pl' } },
    { type: 'contact', id: 'p1', data: { id: 'p1', name: 'Anna Nowak', email: 'anna@alfa.pl', company: 'c1' } }
  ] });
  const postmark = { FromFull: { Email: owner.email, Name: owner.name }, ToFull: [{ Email: 'anna@alfa.pl', Name: 'Anna Nowak' }, { Email: 'piotr@alfa.pl', Name: 'Piotr Lis' }], BccFull: [{ Email: box }], Subject: 'Oferta na wdrożenie', TextBody: 'Dzień dobry, w załączniku oferta.\n\nOn Thu, Oct 29, 2026 Anna wrote:\n> pytanie', Date: 'Fri, 30 Oct 2026 09:15:00 +0100', MessageID: 'm-1' };
  const r = await hook(postmark);
  assert.equal(r.json().logged, 2);
  const st = (await A.get('/api/state')).json.db;
  const acts = st.activity.filter((a: any) => a.via === 'bcc');
  assert.equal(acts.length, 2);
  assert.ok(acts.every((a: any) => a.type === 'email' && a.text.startsWith('Wysłano: Oferta na wdrożenie') && !a.text.includes('pytanie')));
  assert.equal(acts[0].at, '2026-10-30T09:15');
  const piotr = st.contact.find((c: any) => c.email === 'piotr@alfa.pl');
  assert.equal(piotr.name, 'Piotr Lis');
  assert.equal(piotr.company, 'c1', 'nowy kontakt przypisany do firmy po domenie');
  assert.equal((await hook(postmark)).json().logged, 0, 'ten sam mail drugi raz się nie dubluje');
});

test('BCC: mail od klienta przekazany do Hermesa, zły sekret i nieznana skrzynka', async () => {
  const box = (await A.get('/api/org/mailbox')).json.address;
  const r = await hook({ from: 'Maria Zając <maria@gmail.com>', to: `${owner.email}, ${box}`, subject: 'Pytanie o cenę', text: 'Ile kosztuje wersja dla 5 osób?' });
  assert.equal(r.json().logged, 1);
  const st = (await A.get('/api/state')).json.db;
  const maria = st.contact.find((c: any) => c.email === 'maria@gmail.com');
  assert.equal(maria.company, '', 'darmowa domena nie wskazuje firmy');
  assert.ok(st.activity.some((a: any) => a.rid === maria.id && a.text.startsWith('Otrzymano: Pytanie o cenę')));
  assert.equal((await hook({ from: 'x@y.pl', to: box }, 'zly-sekret-12345')).statusCode, 404);
  assert.equal((await hook({ from: 'x@y.pl', to: 'hermes-000000000000@in.hermes.test' })).json().logged, 0);
  const B = client(env.app);
  assert.equal((await B.post('/api/org/mailbox')).status, 401);
});

test('seria powitalna: powitanie po rejestracji, dzień 2 i dzień 5 raz', async () => {
  const welcome = mail.outbox.find(m => m.subject.startsWith('Witaj w Hermesie'));
  assert.ok(welcome && welcome.to === owner.email && welcome.text.includes('Pipedrive'));
  const later = new Date(Date.now() + 2.5 * 864e5);
  assert.equal(await runOnboarding(env.app, later), 1);
  assert.match(mail.outbox.at(-1)!.subject, /lejek jest jeszcze pusty/, 'bez leadów i szans podpowiedź importu');
  assert.equal(await runOnboarding(env.app, later), 0, 'każdy krok raz');
  assert.equal(await runOnboarding(env.app, new Date(Date.now() + 5.5 * 864e5)), 1);
  assert.match(mail.outbox.at(-1)!.subject, /Zaproś zespół/);
});
