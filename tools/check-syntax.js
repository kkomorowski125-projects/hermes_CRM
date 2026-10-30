// Wyciąga skrypt z index.html i sprawdza jego składnię, bez uruchamiania aplikacji.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const i = html.indexOf('<script>') + 8, j = html.indexOf('</script>', i);
try { new vm.Script(html.slice(i, j), { filename: 'index.html#script' }); console.log('Składnia skryptu poprawna'); }
catch (e) { console.error(e.message); process.exit(1); }
