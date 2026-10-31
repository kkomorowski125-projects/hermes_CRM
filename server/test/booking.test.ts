// Umawianie spotkań: wolne terminy w czasie polskim, rezerwacja zapisana w CRM, maile z .ics, odwołanie.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { freshApp, client, owner } from './helpers.js';
import { memoryMailer } from '../src/mail.js';
import { freeSlots, zoned, cleanBooking, ics, whenLabel } from '../src/booking.js';

const mail = memoryMailer();
const env = await freshApp({}, { mailer: mail });
after(() => env.close());
const A = client(env.app);
await A.post('/api/auth/register', owner);
const anon = client(env.app);
const settle = () => new Promise(r => setTimeout(r, 40));

test('strefa czasowa: 9:00 w Polsce zimą i latem', () => {
  assert.equal(new Date(zoned('2026-01-15', '09:00')).toISOString(), '2026-01-15T08:00:00.000Z');
  assert.equal(new Date(zoned('2026-07-15', '09:00')).toISOString(), '2026-07-15T07:00:00.000Z');
  assert.equal(new Date(zoned('2026-10-25', '09:00')).toISOString(), '2026-10-25T08:00:00.000Z', 'dzień zmiany czasu');
});

test('wolne terminy: dni robocze, godziny, wyprzedzenie i bufor', () => {
  const s = cleanBooking({ duration: 30, buffer: 15, days: [1, 2, 3, 4, 5], from: '09:00', to: '11:00', notice: 2, horizon: 7 });
  const nowMs = Date.parse('2026-11-02T07:30:00Z'); /* poniedziałek 8:30 w Polsce */
  const busy = [{ s: zoned('2026-11-03', '10:00'), e: zoned('2026-11-03', '10:30') }];
  const days = freeSlots(s, busy, nowMs);
  assert.deepEqual(days.map(d => d.day), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'], 'bez soboty i niedzieli');
  assert.deepEqual(days[0].times.map(t => new Date(t).toISOString().slice(11, 16)), ['09:30'], 'dziś dopiero 10:30 czasu polskiego (2 h wyprzedzenia)');
  assert.match(whenLabel(days[0].times[0], '2026-11-02T10:00:00Z'), /^poniedziałek, 2 listopada, 10:30 do 11:00$/);
  const tue = days[1].times.map(t => new Date(t).toISOString().slice(11, 16));
  assert.deepEqual(tue, ['08:00'], 'wtorek: 9:00 wolne, 9:30 i 10:30 zablokowane buforem 15 min wokół 10:00');
  assert.equal(cleanBooking({ from: '17:00', to: '09:00', duration: 7, days: [9] }).from, '09:00', 'złe wartości wracają do domyślnych');
  assert.equal(cleanBooking({ duration: 7 }).duration, 30);
});

test('zaproszenie .ics', () => {
  const t = ics({ uid: 'x1', start: '2026-11-03T09:00:00.000Z', end: '2026-11-03T09:30:00.000Z', title: 'Rozmowa: Anna, Kamil', location: 'Meet; sala 2', organizer: { name: 'Kamil', email: 'k@x.pl' }, attendee: { name: 'Anna', email: 'a@y.pl' } });
  assert.match(t, /BEGIN:VCALENDAR\r\n/);
  assert.match(t, /DTSTART:20261103T090000Z/);
  assert.match(t, /SUMMARY:Rozmowa: Anna\\, Kamil/);
  assert.match(t, /LOCATION:Meet\\; sala 2/);
  assert.match(ics({ uid: 'x1', start: '2026-11-03T09:00:00.000Z', end: '2026-11-03T09:30:00.000Z', title: 'R', organizer: { name: 'K', email: 'k@x.pl' }, attendee: { name: 'A', email: 'a@y.pl' }, cancel: true }), /METHOD:CANCEL[\s\S]*STATUS:CANCELLED/);
});

test('link do umawiania: rezerwacja trafia do CRM jako spotkanie przy szansie', async () => {
  assert.equal((await A.get('/api/booking')).json.page, null);
  const put = await A.raw('PUT', '/api/booking', { settings: { title: 'Rozmowa wstępna', duration: 30, buffer: 0, days: [1, 2, 3, 4, 5, 6, 7], from: '00:00', to: '23:30', notice: 0, horizon: 14, location: 'Google Meet' } });
  assert.equal(put.status, 200);
  const { id, url } = put.json.page;
  assert.equal(url, `http://test/umow/${id}`);
  /* istniejąca szansa z kontaktem: spotkanie powinno trafić do niej */
  await A.post('/api/sync', { upserts: [
    { type: 'company', id: 'c1', data: { id: 'c1', name: 'Alfa', domain: 'alfa.pl' } },
    { type: 'contact', id: 'p1', data: { id: 'p1', name: 'Anna Nowak', email: 'anna@alfa.pl', company: 'c1' } },
    { type: 'deal', id: 'd1', data: { id: 'd1', name: 'Wdrożenie', company: 'c1', contacts: ['p1'], stage: 'Oferta', value: 10000, owner: owner.name, nextStep: 'Follow up', nextDate: '2099-01-01' } }
  ] });
  const page = await anon.get(`/umow/${id}`);
  assert.equal(page.status, 200);
  assert.match(page.body, /Rozmowa wstępna/);
  assert.match(page.body, /Kamil Komorowski/);
  const slots = await anon.get(`/api/public/booking/${id}/slots`);
  assert.ok(slots.json.days.length >= 13, 'wolne dni na dwa tygodnie');
  const start = slots.json.days[1].times[3];
  const res = await anon.raw('POST', `/api/public/booking/${id}`, { start, name: 'Anna Nowak', email: 'Anna@alfa.pl', topic: 'Cennik dla 20 osób' }, {});
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.match(res.json.when, /\d{1,2}:\d\d do \d{1,2}:\d\d/);
  const again = await anon.raw('POST', `/api/public/booking/${id}`, { start, name: 'Ktoś', email: 'k@beta.pl' }, {});
  assert.equal(again.status, 409, 'termin zajęty');
  const after1 = await anon.get(`/api/public/booking/${id}/slots`);
  assert.ok(!after1.json.days.some((d: any) => d.times.includes(start)), 'termin znika z listy');

  const ch = (await A.get('/api/changes?since=2000-01-01')).json;
  const recs = (t: string) => ch.changes.filter((r: any) => r.type === t).map((r: any) => r.data);
  const appt = recs('activity').find((a: any) => a.type === 'appt');
  assert.ok(appt, 'spotkanie zapisane w CRM');
  assert.equal(appt.obj, 'deal'); assert.equal(appt.rid, 'd1'); assert.equal(appt.who, 'p1');
  assert.equal(appt.by, owner.name); assert.equal(appt.via, 'booking');
  assert.match(appt.at, /^\d{4}-\d\d-\d\dT\d\d:\d\d$/);
  const deal = recs('deal').find((d: any) => d.id === 'd1');
  assert.equal(deal.nextStep, 'Rozmowa wstępna: Cennik dla 20 osób', 'następny krok ustawiony na spotkanie');
  assert.equal(deal.nextDate, appt.at.slice(0, 10));
  assert.equal(recs('contact').length, 1, 'bez duplikatu kontaktu (email bez względu na wielkość liter)');

  await settle();
  const toClient = mail.outbox.find(m => m.to === 'anna@alfa.pl');
  const toOwner = mail.outbox.find(m => m.to === owner.email);
  assert.ok(toClient && toOwner, 'potwierdzenie do klienta i informacja do handlowca');
  assert.match(toClient!.attachments![0].content, /METHOD:REQUEST/);
  assert.match(toClient!.text, /umow\/anuluj\//);

  /* odwołanie z linku w mailu */
  const token = toClient!.text.match(/umow\/anuluj\/([\w-]+)/)![1];
  assert.match((await anon.get(`/umow/anuluj/${token}`)).body, /Odwołać spotkanie/);
  const ics1 = await anon.get(`/api/public/booking/ics/${token}`);
  assert.match(ics1.body, /BEGIN:VEVENT/);
  const cancel = await anon.raw('POST', `/api/public/booking/cancel/${token}`, 'x=1', { 'content-type': 'application/x-www-form-urlencoded' });
  assert.equal(cancel.status, 200);
  assert.match(cancel.body, /Spotkanie odwołane/);
  const ch2 = (await A.get('/api/changes?since=2000-01-01')).json.changes;
  assert.equal(ch2.find((r: any) => r.data.id === appt.id).data.cancelled, true);
  assert.equal(ch2.find((r: any) => r.data.id === 'd1').data.nextStep, 'Ustalić nowy termin spotkania');
  assert.ok((await anon.get(`/api/public/booking/${id}/slots`)).json.days.some((d: any) => d.times.includes(start)), 'termin znowu wolny');
  await settle();
  assert.ok(mail.outbox.some(m => m.to === owner.email && /Odwołane/.test(m.subject)));
});

test('nowa osoba bez szansy: nowy kontakt, firma i lead ze źródłem Kalendarz; odwołanie przez handlowca', async () => {
  const { page } = (await A.get('/api/booking')).json;
  const slots = (await anon.get(`/api/public/booking/${page.id}/slots`)).json;
  const start = slots.days[2].times[0];
  const res = await anon.raw('POST', `/api/public/booking/${page.id}`, { start, name: 'Piotr Lis', email: 'piotr@beta.pl', company: 'Beta', phone: '600 100 200' }, {});
  assert.equal(res.status, 200);
  const recs = (await A.get('/api/changes?since=2000-01-01')).json.changes.map((r: any) => ({ t: r.type, ...r.data }));
  const lead = recs.find((r: any) => r.t === 'lead' && r.source === 'Kalendarz');
  assert.ok(lead, 'nowy lead');
  assert.equal(lead.owner, owner.name);
  assert.equal(lead.status, 'Nowy');
  const comp = recs.find((r: any) => r.t === 'company' && r.name === 'Beta');
  assert.equal(comp.domain, 'beta.pl');
  const person = recs.find((r: any) => r.t === 'contact' && r.email === 'piotr@beta.pl');
  assert.equal(person.company, comp.id);
  assert.deepEqual(lead.contacts, [person.id]);
  const appt = recs.find((r: any) => r.t === 'activity' && r.type === 'appt' && r.rid === lead.id);
  assert.ok(appt);
  mail.outbox.length = 0;
  const bad = await anon.raw('POST', `/api/public/booking/${page.id}`, { start: '2020-01-01T10:00:00.000Z', name: 'X Y', email: 'x@y.pl' }, {});
  assert.equal(bad.status, 409, 'termin spoza listy');
  assert.equal((await anon.raw('POST', `/api/public/booking/${page.id}`, { start, name: 'X', email: 'zly' }, {})).status, 400);
  const c = await A.post(`/api/bookings/${appt.bookingId}/cancel`);
  assert.equal(c.status, 200);
  await settle();
  assert.ok(mail.outbox.some(m => m.to === 'piotr@beta.pl' && /Odwołane/.test(m.subject) && /METHOD:CANCEL/.test(m.attachments![0].content)), 'klient dostaje odwołanie');
});

test('spotkanie zaplanowane w CRM blokuje termin na stronie', async () => {
  const { page } = (await A.get('/api/booking')).json;
  const day = (await anon.get(`/api/public/booking/${page.id}/slots`)).json.days[4];
  const t = day.times[2];
  const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(' ', 'T');
  const end = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(Date.parse(t) + 3600e3)).replace(' ', 'T');
  await A.post('/api/sync', { upserts: [{ type: 'activity', id: 'a9', data: { id: 'a9', obj: 'deal', rid: 'd1', type: 'appt', text: 'Demo', at: local, end, by: owner.name } }] });
  const after2 = (await anon.get(`/api/public/booking/${page.id}/slots`)).json.days.find((d: any) => d.day === day.day);
  assert.ok(!after2 || !after2.times.includes(t), 'termin zajęty przez spotkanie z CRM');
  assert.equal((await anon.get('/umow/nieistnieje')).status, 404);
});
