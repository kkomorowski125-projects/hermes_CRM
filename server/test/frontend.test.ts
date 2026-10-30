// Testy aplikacji w trybie serwera: index.html w jsdom rozmawia z prawdziwym API (fetch przez app.inject).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { freshApp, client, owner } from './helpers.js';

const HTML = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.html'), 'utf8');
const env = await freshApp();
const opened: any[] = [];
after(async () => { opened.forEach(w => w.close()); await env.close(); });
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));
async function until(fn: () => unknown, what: string, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return; await tick(); }
  throw new Error('Nie doczekano: ' + what);
}

/** Otwiera aplikację jak przeglądarka z ciasteczkiem danej osoby (pusty = niezalogowany). */
function browser(cookie: string, search = '') {
  const errs: string[] = [];
  let jar = cookie;
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', url: 'http://localhost/' + search, pretendToBeVisual: true,
    beforeParse(w: any) {
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.fetch = async (url: string, opt: any = {}) => {
        const res = await env.app.inject({ method: opt.method || 'GET', url, payload: opt.body, headers: { ...(opt.headers || {}), ...(jar ? { cookie: jar } : {}) } });
        const sc = res.headers['set-cookie'];
        if (sc) { const v = (Array.isArray(sc) ? sc[0] : sc).split(';')[0]; jar = v.endsWith('=') ? '' : v; }
        return { ok: res.statusCode < 400, status: res.statusCode, headers: { get: (k: string) => String(res.headers[k.toLowerCase()] || '') }, json: async () => JSON.parse(res.body) };
      };
    }
  });
  const w = dom.window as any;
  opened.push(w);
  w.addEventListener('error', (e: any) => errs.push(e.message));
  return { w, d: w.document as Document, E: (s: string) => w.eval(s), errs, close: () => w.close() };
}

const A = client(env.app);
await A.post('/api/auth/register', owner);

test('bez sesji: ekran logowania, a w nim rejestracja i przypomnienie hasła', async () => {
  const b = browser('');
  await until(() => b.d.querySelector('#authForm'), 'formularz logowania');
  assert.ok(b.d.body.classList.contains('auth-on'));
  (b.d.querySelector('[data-m="register"]') as HTMLElement).click();
  assert.ok(b.d.querySelector('#au-company'), 'pole nazwy firmy');
  (b.d.querySelector('[data-m="login"]') as HTMLElement).click();
  (b.d.querySelector('#au-email') as HTMLInputElement).value = owner.email;
  (b.d.querySelector('#au-password') as HTMLInputElement).value = 'zlehaslo12345';
  b.d.querySelector('#authForm')!.dispatchEvent(new b.w.Event('submit', { bubbles: true, cancelable: true }));
  await until(() => b.d.querySelector('#authErr')?.textContent?.includes('Nieprawidłowy'), 'komunikat o błędnym haśle');
  assert.deepEqual(b.errs, []);
  b.close();
});

test('zalogowany: dane z serwera, zapis zmian i zmiany innych osób', async () => {
  const b = browser(A.cookie);
  await until(() => b.E('SRV.s'), 'sesja');
  assert.equal(b.E('SRV.on'), true);
  assert.equal(b.E('settings.company'), 'Przewaga');
  assert.equal(b.d.querySelector('#syncState')?.textContent, 'Zsynchronizowano');
  (b.d.querySelector('[data-act="demo-quick"]') as HTMLElement).click();
  await b.E('srvSync()');
  const st = await A.get('/api/state');
  assert.equal(st.json.db.deal.length, b.E('db.deal.length'), 'szanse demo są na serwerze');
  assert.ok(st.json.db.activity.length > 0, 'historia jest na serwerze');
  assert.equal(b.E('localStorage.getItem("hermes-crm-v3")'), null, 'tryb serwera nie zapisuje danych w przeglądarce');

  /* zmiana od innej osoby trafia do otwartej aplikacji */
  const deal = st.json.db.deal[0];
  await A.post('/api/sync', { upserts: [{ type: 'deal', id: deal.id, data: { ...deal, name: 'Zmiana z innego urządzenia' } }] });
  await b.E('srvPoll()');
  assert.equal(b.E(`find('deal', '${deal.id}').name`), 'Zmiana z innego urządzenia');

  /* usunięcie w aplikacji usuwa na serwerze */
  b.E(`db.deal = db.deal.filter(d => d.id !== '${deal.id}'); save()`);
  await b.E('srvSync()');
  assert.ok(!(await A.get('/api/state')).json.db.deal.some((d: any) => d.id === deal.id));

  /* ustawienia firmy (cel) zapisuje administrator */
  b.E('settings.target = 250000; save()');
  await b.E('srvSync()');
  assert.equal((await A.get('/api/state')).json.settings.target, 250000);
  assert.deepEqual(b.errs, []);
  b.close();
});

test('zespół: zaproszenie z Ustawień, rola podglądu i Hermes AI bez klucza', async () => {
  const b = browser(A.cookie);
  await until(() => b.E('SRV.s'), 'sesja');
  b.E("state.page = 'settings'; state.settingsObj = 'team'; render()");
  await until(() => b.d.querySelector('#inviteForm'), 'formularz zaproszenia');
  (b.d.querySelector('#iv-email') as HTMLInputElement).value = 'ola@przewaga.pl';
  (b.d.querySelector('#iv-role') as HTMLSelectElement).value = 'viewer';
  b.d.querySelector('#inviteForm')!.dispatchEvent(new b.w.Event('submit', { bubbles: true, cancelable: true }));
  await until(() => b.d.querySelector('#srv-link'), 'link zaproszenia');
  const link = (b.d.querySelector('#srv-link') as HTMLInputElement).value;
  assert.match(link, /\?invite=/);

  const O = client(env.app);
  const token = new URL(link).searchParams.get('invite')!;
  const inv = browser('', '?invite=' + token);
  await until(() => inv.d.querySelector('#au-name'), 'formularz zaproszenia');
  assert.match(inv.d.querySelector('#authLayer h1')!.textContent!, /Przewaga/);
  inv.close();
  assert.equal((await O.post(`/api/invites/${token}/accept`, { name: 'Ola Lis', password: 'olahaslo1234' })).status, 200);

  const v = browser(O.cookie);
  await until(() => v.E('SRV.s'), 'sesja podglądu');
  assert.ok(v.d.querySelector('.ro-banner'), 'baner tylko do podglądu');
  assert.equal(v.d.querySelector('#syncState')?.textContent, 'Tylko podgląd');
  assert.equal(v.E('aiLive()'), false);
  v.E("state.page = 'settings'; render()");
  assert.equal(v.d.querySelectorAll('[data-act="stab"]').length, 2, 'podgląd widzi tylko Ogólne i Zespół');
  assert.deepEqual([...b.errs, ...v.errs], []);
  b.close(); v.close();
});
