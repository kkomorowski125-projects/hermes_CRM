// Umawianie spotkań: ustawienia dostępności, wolne terminy w czasie polskim i zaproszenia w formacie iCalendar.
// Logika jest czysta (bez bazy), żeby testy mogły ją sprawdzać na stałych datach.
import { warsaw } from './routes-growth.js';

export type BookingSettings = {
  title: string; duration: number; buffer: number; days: number[]; from: string; to: string;
  notice: number; horizon: number; location: string; intro: string; active: boolean;
};
export const DEFAULT_BOOKING: BookingSettings = {
  title: 'Rozmowa', duration: 30, buffer: 10, days: [1, 2, 3, 4, 5], from: '09:00', to: '16:00',
  notice: 4, horizon: 21, location: 'Google Meet albo telefon', intro: '', active: true
};
const hm = (v: unknown, d: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const num = (v: unknown, min: number, max: number, d: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };

/** Ustawienia z zapytania przycięte do bezpiecznych wartości. */
export function cleanBooking(raw: any): BookingSettings {
  const b = raw && typeof raw === 'object' ? raw : {};
  const D = DEFAULT_BOOKING;
  let from = hm(b.from, D.from), to = hm(b.to, D.to);
  if (to <= from) { from = D.from; to = D.to; }
  const days = Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter((x: number) => x >= 1 && x <= 7))].sort() as number[] : D.days;
  return {
    title: String(b.title ?? D.title).trim().slice(0, 80) || D.title,
    duration: [15, 20, 30, 45, 60, 90].includes(Number(b.duration)) ? Number(b.duration) : D.duration,
    buffer: num(b.buffer, 0, 60, D.buffer), days: days.length ? days : D.days, from, to,
    notice: num(b.notice, 0, 168, D.notice), horizon: num(b.horizon, 1, 60, D.horizon),
    location: String(b.location ?? D.location).trim().slice(0, 200), intro: String(b.intro ?? '').trim().slice(0, 600),
    active: b.active !== false
  };
}

/** Przesunięcie strefy Europe/Warsaw względem UTC w minutach dla danej chwili. */
function offsetMin(ms: number) {
  const a = warsaw(new Date(ms)).at;
  const local = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10), +a.slice(11, 13), +a.slice(14, 16));
  return Math.round((local - Math.floor(ms / 60000) * 60000) / 60000);
}
/** Godzina zegarowa w Polsce (dzień + HH:MM) jako chwila UTC w milisekundach, także przy zmianie czasu. */
export function zoned(day: string, time: string) {
  const guess = Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), +time.slice(0, 2), +time.slice(3, 5));
  let utc = guess - offsetMin(guess) * 60000;
  const o2 = offsetMin(utc);
  if (guess - o2 * 60000 !== utc) utc = guess - o2 * 60000;
  return utc;
}
export const addDay = (day: string, n: number) => new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10) + n, 12)).toISOString().slice(0, 10);
const isoDow = (day: string) => new Date(day + 'T12:00:00Z').getUTCDay() || 7;

export type Busy = { s: number; e: number };
/** Wolne terminy: dni robocze z ustawień, godziny pracy, minimalne wyprzedzenie, bufor wokół zajętych spotkań. */
export function freeSlots(s: BookingSettings, busy: Busy[], nowMs = Date.now()) {
  const out: { day: string; times: string[] }[] = [];
  const dur = s.duration * 60000, buf = s.buffer * 60000, step = (s.duration <= 15 ? 15 : 30) * 60000;
  const earliest = nowMs + s.notice * 3600000;
  const first = warsaw(new Date(nowMs)).day;
  for (let i = 0; i < s.horizon; i++) {
    const day = addDay(first, i);
    if (!s.days.includes(isoDow(day))) continue;
    const end = zoned(day, s.to), times: string[] = [];
    for (let t = zoned(day, s.from); t + dur <= end; t += step) {
      if (t < earliest) continue;
      if (busy.some(b => t - buf < b.e && t + dur + buf > b.s)) continue;
      times.push(new Date(t).toISOString());
    }
    if (times.length) out.push({ day, times });
  }
  return out;
}

const PL = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'long', day: 'numeric', month: 'long' });
const PLT = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' });
/** „poniedziałek, 3 listopada, 10:00 do 10:30” */
export const whenLabel = (startIso: string, endIso: string) => `${PL.format(new Date(startIso))}, ${PLT.format(new Date(startIso))} do ${PLT.format(new Date(endIso))}`;

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
/** Zaproszenie .ics (METHOD:REQUEST) albo odwołanie (METHOD:CANCEL) zgodne z Google, Outlook i Apple. */
export function ics(o: { uid: string; start: string; end: string; title: string; description?: string; location?: string; organizer: { name: string; email: string }; attendee: { name: string; email: string }; cancel?: boolean }) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hermes CRM//PL', 'CALSCALE:GREGORIAN', `METHOD:${o.cancel ? 'CANCEL' : 'REQUEST'}`,
    'BEGIN:VEVENT', `UID:${o.uid}@hermes-crm`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${icsDate(o.start)}`, `DTEND:${icsDate(o.end)}`,
    `SUMMARY:${icsText(o.title)}`, o.description ? `DESCRIPTION:${icsText(o.description)}` : '', o.location ? `LOCATION:${icsText(o.location)}` : '',
    `ORGANIZER;CN=${icsText(o.organizer.name)}:mailto:${o.organizer.email}`,
    `ATTENDEE;CN=${icsText(o.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${o.attendee.email}`,
    `SEQUENCE:${o.cancel ? 1 : 0}`, `STATUS:${o.cancel ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  /* linie dłuższe niż 75 bajtów zawijamy zgodnie z RFC 5545 */
  return lines.map(l => { const out: string[] = []; let rest = l; while (Buffer.byteLength(rest) > 74) { let cut = 74; while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--; out.push(rest.slice(0, cut)); rest = ' ' + rest.slice(cut); } out.push(rest); return out.join('\r\n'); }).join('\r\n') + '\r\n';
}
