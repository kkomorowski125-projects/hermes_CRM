// Raport tygodniowy dla administratorów: wygrane, nowe leady i szanse, przegrane i aktywność każdej osoby z zespołu.
import type { FastifyInstance } from 'fastify';
import { parseJson } from './context.js';
import { layout } from './mail.js';
import { warsaw } from './routes-growth.js';

const money = (n: number) => Math.round(n).toLocaleString('pl-PL') + ' zł';
/** Poprzedni tydzień od poniedziałku do niedzieli, daty w czasie polskim. */
export function lastWeek(at = new Date()) {
  const today = new Date(warsaw(at).day + 'T12:00:00Z');
  const dow = (today.getUTCDay() + 6) % 7;
  const mon = new Date(today.getTime() - (dow + 7) * 864e5), sun = new Date(mon.getTime() + 6 * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(mon), to: iso(sun), key: iso(mon) };
}
export function weekStats(recs: any[], from: string, to: string) {
  const inR = (d: unknown) => typeof d === 'string' && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const deals = recs.filter(r => r._t === 'deal'), leads = recs.filter(r => r._t === 'lead'), acts = recs.filter(r => r._t === 'activity');
  const owners = [...new Set([...deals, ...leads].map(r => r.owner).filter(Boolean))] as string[];
  const per = owners.map(o => {
    const won = deals.filter(d => d.owner === o && d.stage === 'Wygrana' && inR(d.closedAt));
    const mine = new Set([...deals, ...leads].filter(r => r.owner === o).map(r => r.id));
    return { owner: o, won: won.length, wonValue: won.reduce((a, d) => a + (Number(d.value) || 0), 0), newDeals: deals.filter(d => d.owner === o && inR(d.created)).length,
      newLeads: leads.filter(l => l.owner === o && inR(l.created)).length, lost: deals.filter(d => d.owner === o && d.stage === 'Przegrana' && inR(d.closedAt)).length,
      activities: acts.filter(a => ['call', 'email', 'meeting', 'note'].includes(a.type) && inR(a.at) && mine.has(a.rid)).length };
  }).sort((a, b) => b.wonValue - a.wonValue);
  const sum = (k: keyof typeof per[number]) => per.reduce((a, p) => a + Number(p[k]), 0);
  const open = deals.filter(d => d.stage !== 'Wygrana' && d.stage !== 'Przegrana');
  return { per, won: sum('won'), wonValue: sum('wonValue'), newLeads: sum('newLeads'), newDeals: sum('newDeals'), lost: sum('lost'), pipeline: open.reduce((a, d) => a + (Number(d.value) || 0), 0), noStep: open.filter(d => !d.nextStep).length };
}
export async function runWeekly(app: FastifyInstance, at = new Date()) {
  const { db, cfg } = app;
  const w = lastWeek(at);
  let sent = 0;
  for (const org of await db.all('SELECT id, name FROM orgs')) {
    if (await db.one('SELECT 1 AS x FROM weekly_reports WHERE org_id = ? AND week = ?', [org.id, w.key])) continue;
    await db.run('INSERT INTO weekly_reports (org_id, week) VALUES (?, ?)', [org.id, w.key]);
    const recs = (await db.all("SELECT type, data FROM records WHERE org_id = ? AND deleted = 0 AND type IN ('deal', 'lead', 'activity')", [org.id])).map(r => ({ ...parseJson<any>(r.data, {}), _t: r.type }));
    const s = weekStats(recs, w.from, w.to);
    if (!s.per.length && !s.newLeads) continue;
    const lines = [`Podsumowanie tygodnia ${w.from.slice(8)}.${w.from.slice(5, 7)} do ${w.to.slice(8)}.${w.to.slice(5, 7)} w ${org.name}:`,
      `Wygrane: ${s.won} za ${money(s.wonValue)}. Nowe leady: ${s.newLeads}, nowe szanse: ${s.newDeals}, przegrane: ${s.lost}.`,
      `Otwarty lejek: ${money(s.pipeline)}${s.noStep ? `, w tym ${s.noStep} ${s.noStep === 1 ? 'szansa' : 'szans'} bez następnego kroku` : ''}.`,
      ...s.per.map(p => `• ${p.owner}: wygrane ${p.won} (${money(p.wonValue)}), nowe leady ${p.newLeads}, nowe szanse ${p.newDeals}, aktywności ${p.activities}`)];
    for (const a of await db.all("SELECT u.email FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND m.role = 'admin'", [org.id]))
      if (await app.mail.send({ to: a.email, subject: `Tydzień w ${org.name}: ${s.won} ${s.won === 1 ? 'wygrana' : 'wygranych'}, ${money(s.wonValue)}`, ...layout(lines, { label: 'Otwórz Analitykę', url: cfg.publicUrl + '/' }, 'Raport tygodniowy wysyłamy administratorom w poniedziałek rano.') })) sent++;
  }
  return sent;
}
