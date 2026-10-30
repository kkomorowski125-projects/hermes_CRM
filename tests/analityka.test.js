// Analityka: okresy, nawigacja, filtr opiekuna, moduły
const { boot, kit, ok, done } = require('./helpers');
const w = boot();
const { d, errs, click, txt, E } = kit(w);
click('[data-act="go"][data-page="analytics"]');
ok(txt('.kpis .kpi strong') === '0 zł', 'pusta analityka bez błędów');
click('[data-act="go"][data-page="overview"]'); click('[data-act="demo-quick"]'); click('[data-act="go"][data-page="analytics"]');
for (const [p, bars] of [['day', 20], ['week', 12], ['month', 9], ['quarter', 6], ['year', 4]]) {
  click(`[data-act="aperiod"][data-v="${p}"]`);
  ok(d.querySelectorAll('.colb').length === bars, `okres ${p}: ${bars} słupków na wykresie`);
  const now = txt('.pnav span');
  click('[data-act="aoff"][data-d="-1"]');
  ok(txt('.pnav span') !== now && !!d.querySelector('[data-act="aoff"][data-d="0"]'), `okres ${p}: przejście do poprzedniego`);
  click('[data-act="aoff"][data-d="0"]');
}
click('[data-act="aperiod"][data-v="quarter"]');
ok(/300 000 zł/.test(txt('#mgrid')), 'cel kwartału = 3 × cel miesięczny');
click('[data-act="aperiod"][data-v="month"]');
ok(E('settings.team.length') >= 1 && !!d.querySelector('[data-act="aowner"]'), 'filtr opiekuna widoczny');
done(errs);
