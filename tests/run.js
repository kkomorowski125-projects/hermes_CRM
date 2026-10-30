// Uruchamia wszystkie pliki *.test.js po kolei i kończy się kodem 1, gdy któryś test nie przejdzie.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
let bad = 0;
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
  console.log(`\n▶ ${f}`);
  try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); }
  catch (e) { bad++; process.stdout.write(e.stdout || ''); process.stderr.write(e.stderr || ''); }
}
console.log(bad ? `\n${bad} plik(i) z błędami` : '\nWszystkie testy zaliczone');
process.exit(bad ? 1 : 0);
