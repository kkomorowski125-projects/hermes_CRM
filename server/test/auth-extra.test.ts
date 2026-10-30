// Testy maili i logowania Google oraz Microsoft z podstawionym dostawcą tożsamości.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { freshApp, client, owner } from './helpers.js';
import { memoryMailer } from '../src/mail.js';
import { totpCode } from '../src/security.js';

const mail = memoryMailer();
const env = await freshApp({
  googleClientId: 'g-id', googleClientSecret: 'g-secret', microsoftClientId: 'm-id', microsoftClientSecret: 'm-secret',
  oauthOverride: { google: { token: 'https://idp.test/google/token' }, microsoft: { token: 'https://idp.test/ms/token' } }
}, { mailer: mail });
after(() => env.close());
const A = client(env.app);
await A.post('/api/auth/register', owner);

/* Podstawiony dostawca: zwraca id_token z podanymi danymi i nonce z żądania logowania. */
let claims: Record<string, unknown> = {};
let lastNonce = '';
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const u = String(url);
  if (!u.startsWith('https://idp.test/')) return realFetch(url, init);
  const body = new URLSearchParams(String(init.body));
  assert.ok(body.get('code_verifier'), 'PKCE: code_verifier w wymianie kodu');
  const payload = { aud: u.includes('google') ? 'g-id' : 'm-id', exp: Math.floor(Date.now() / 1000) + 300, nonce: lastNonce, ...claims };
  const jwt = ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'sig'].join('.');
  return new Response(JSON.stringify({ id_token: jwt }), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

/** Pełny przepływ: start, zgoda u dostawcy, powrót. Zwraca adres powrotu i ciasteczko sesji. */
async function oauth(p: 'google' | 'microsoft', c: Record<string, unknown>, q = '', cookie = '') {
  claims = c;
  const s = await env.app.inject({ method: 'GET', url: `/api/auth/oauth/${p}/start${q}`, headers: cookie ? { cookie } : {} });
  assert.equal(s.statusCode, 302);
  const auth = new URL(String(s.headers.location));
  assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
  lastNonce = auth.searchParams.get('nonce')!;
  const cb = await env.app.inject({ method: 'GET', url: `/api/auth/oauth/${p}/callback?code=abc&state=${encodeURIComponent(auth.searchParams.get('state')!)}` });
  const sc = cb.headers['set-cookie'];
  return { to: new URL(String(cb.headers.location)), cookie: sc ? String(Array.isArray(sc) ? sc[0] : sc).split(';')[0] : '' };
}
const G = { iss: 'https://accounts.google.com', email_verified: true };
const MS = { iss: 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0' };

test('maile: zaproszenie i reset hasła wychodzą z linkiem', async () => {
  const inv = await A.post('/api/org/invites', { email: 'monika@przewaga.pl', role: 'sales' });
  assert.equal(inv.json.sent, true);
  const m = mail.outbox.at(-1)!;
  assert.equal(m.to, 'monika@przewaga.pl');
  assert.match(m.subject, /Przewaga/);
  assert.ok(m.text.includes(inv.json.link) && m.html!.includes('Dołącz do zespołu'));
  const r = await client(env.app).post('/api/auth/reset/request', { email: owner.email });
  assert.equal(r.json.mail, true);
  assert.ok(mail.outbox.at(-1)!.text.includes('/?reset='));
  const before = mail.outbox.length;
  await client(env.app).post('/api/auth/reset/request', { email: 'nikt@nigdzie.pl' });
  assert.equal(mail.outbox.length, before, 'nieznany adres: brak maila i brak informacji o koncie');
});

test('Google: dostawcy, nowa firma, logowanie ponowne', async () => {
  assert.deepEqual((await client(env.app).get('/api/auth/oauth/providers')).json, { google: true, microsoft: true });
  const r = await oauth('google', { ...G, sub: 'g-100', email: 'ewa@nowa.pl', name: 'Ewa Nowak' });
  const t = r.to.searchParams.get('oauth_signup')!;
  assert.ok(t, 'nowa osoba: prośba o nazwę firmy');
  const C = client(env.app);
  assert.equal((await C.get('/api/auth/oauth/pending/' + t)).json.email, 'ewa@nowa.pl');
  assert.equal((await C.post('/api/auth/oauth/complete', { t, company: 'Nowa Sp. z o.o.' })).status, 200);
  const s = await C.get('/api/session');
  assert.equal(s.json.org.name, 'Nowa Sp. z o.o.');
  assert.equal(s.json.role, 'admin');
  const again = await oauth('google', { ...G, sub: 'g-100', email: 'ewa@nowa.pl' });
  assert.equal(again.to.searchParams.get('oauth'), 'ok');
  assert.ok(again.cookie, 'sesja po ponownym logowaniu');
  assert.equal((await C.post('/api/auth/password', { next: 'pierwszehaslo1' })).status, 200, 'konto bez hasła ustawia pierwsze hasło');
});

test('Google: potwierdzony email łączy się z istniejącym kontem, 2FA nadal obowiązuje', async () => {
  const setup = await A.post('/api/auth/2fa/setup');
  await A.post('/api/auth/2fa/enable', { code: totpCode(setup.json.secret) });
  const r = await oauth('google', { ...G, sub: 'g-200', email: owner.email });
  const t = r.to.searchParams.get('oauth_totp')!;
  assert.ok(t && !r.cookie, 'bez kodu nie ma sesji');
  const C = client(env.app);
  assert.equal((await C.post('/api/auth/oauth/totp', { t, code: '000000' })).status, 401);
  assert.equal((await C.post('/api/auth/oauth/totp', { t, code: totpCode(setup.json.secret) })).status, 200);
  assert.equal((await C.get('/api/session')).json.user.email, owner.email);
  const unverified = await oauth('google', { iss: G.iss, email_verified: false, sub: 'g-201', email: owner.email });
  assert.equal(unverified.to.searchParams.get('oauth_error'), 'link_first', 'niepotwierdzony adres nie przejmuje konta');
});

test('Microsoft: łączenie w Ustawieniach, zaproszenie i błędy', async () => {
  const blocked = await oauth('microsoft', { ...MS, sub: 'm-1', email: owner.email });
  assert.equal(blocked.to.searchParams.get('oauth_error'), 'link_first', 'Microsoft nie łączy kont po adresie');
  const linked = await oauth('microsoft', { ...MS, sub: 'm-1', email: owner.email }, '?mode=link', A.cookie);
  assert.equal(linked.to.searchParams.get('oauth'), 'linked');
  const ids = await A.get('/api/me/identities');
  assert.deepEqual(ids.json.identities.map((i: any) => i.provider).sort(), ['google', 'microsoft']);
  assert.equal((await oauth('microsoft', { ...MS, sub: 'm-1' })).to.searchParams.get('oauth_totp') !== null, true, 'połączone konto loguje (z 2FA)');
  assert.equal((await oauth('microsoft', { iss: 'https://evil.test', sub: 'm-1' })).to.searchParams.get('oauth_error'), 'provider', 'zły wydawca');
  const inv = await A.post('/api/org/invites', { email: 'jan@przewaga.pl', role: 'viewer' });
  const token = new URL(inv.json.link).searchParams.get('invite')!;
  assert.equal((await oauth('microsoft', { ...MS, sub: 'm-2', email: 'jan@przewaga.pl' }, '?invite=' + token)).to.searchParams.get('oauth_error'), 'invite_email');
  const ok = await oauth('google', { ...G, sub: 'g-300', email: 'jan@przewaga.pl', name: 'Jan Lis' }, '?invite=' + token);
  assert.equal(ok.to.searchParams.get('oauth'), 'ok');
  const J = await env.app.inject({ method: 'GET', url: '/api/session', headers: { cookie: ok.cookie } });
  assert.equal(J.json().role, 'viewer');
  const st = await env.app.inject({ method: 'GET', url: '/api/auth/oauth/google/callback?code=x&state=zly' });
  assert.equal(new URL(String(st.headers.location)).searchParams.get('oauth_error'), 'state');
});
