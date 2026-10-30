// Wspólne narzędzia testów: ładują index.html w jsdom i liczą wyniki.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function boot(pre) {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously', url: 'http://localhost/',
    beforeParse(w) {
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = () => {};
      w.URL.createObjectURL = () => 'blob:x';
      w.URL.revokeObjectURL = () => {};
      if (pre) pre(w);
    }
  });
  return dom.window;
}
function kit(w) {
  const d = w.document, errs = [];
  w.addEventListener('error', e => errs.push(e.message));
  const click = s => { const el = typeof s === 'string' ? d.querySelector(s) : s; if (!el) throw new Error('Brak elementu: ' + s); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  const submit = s => d.querySelector(s).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const chg = (s, v) => { const i = d.querySelector(s); i.value = v; i.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const inp = (s, v) => { const i = d.querySelector(s); i.value = v; i.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const key = (t, k, o = {}) => t.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, ...o }));
  const txt = s => d.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim();
  const E = s => w.eval(s);
  return { d, errs, click, submit, chg, inp, key, txt, E };
}
let failed = 0, passed = 0;
const ok = (c, m) => { if (c) passed++; else failed++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const wait = ms => new Promise(r => setTimeout(r, ms));
function done(errs) {
  if (errs && errs.length) { failed++; console.log('  ✗ błędy JavaScript: ' + errs.join(' | ')); }
  console.log(`  ${passed} zaliczonych, ${failed} niezaliczonych`);
  if (failed) process.exitCode = 1;
}
module.exports = { boot, kit, ok, wait, done };
