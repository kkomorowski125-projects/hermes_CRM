// Hermes Voice: parser mowy i zapis rekordów
const { boot, kit, ok, wait, done } = require('./helpers');
let w = boot();
let { d, errs, click, submit, chg, inp, key, txt, E } = kit(w);
(async()=>{
click('[data-act="demo-quick"]');
const P = t => w.parseVoice(t, '');
let r = P('Nowy lead Kwiaciarnia Róża z Krakowa, kontakt Anna Mazur, właścicielka, telefon 501 300 200, źródło polecenie, wartość 8 tysięcy, następny krok zadzwonić jutro');
ok(r.company.name === 'Kwiaciarnia Róża' && r.company.city === 'Kraków', 'parser: firma i miasto');
ok(r.contact.name === 'Anna Mazur' && r.contact.role === 'Właścicielka' && r.contact.phone === '501 300 200', 'parser: kontakt, rola, telefon');
ok(r.want.lead && !r.want.deal && r.lead.source === 'Polecenie' && r.lead.value === 8000 && r.lead.nextDate === E('addDays(1)'), 'parser: lead, źródło, wartość, termin');
r = P('Szansa Wdrożenie sklepu dla firmy Meble Dębowe za 40 tysięcy, etap oferta, kontakt Jan Dąb, następny krok wysłać ofertę w piątek');
ok(r.want.deal && r.deal.name === 'Wdrożenie sklepu' && r.deal.stage === 'Oferta' && r.deal.value === 40000 && r.company.name === 'Meble Dębowe', 'parser: szansa z etapem, kwotą i firmą');
r = P('Dodaj kontakt Piotr Zieliński, dyrektor sprzedaży w firmie Alfa Logistyka, email piotr małpa alfa kropka pl');
ok(r.contact.email === 'piotr@alfa.pl' && r.contact.role === 'Dyrektor sprzedaży' && r.company.name === 'Alfa Logistyka' && !r.want.lead, 'parser: email mówiony, stanowisko, firma');
r = P('lead Gamma, wartość pięćdziesiąt tysięcy złotych, krok demo 15 listopada');
ok(r.lead.value === 50000 && /-11-15$/.test(r.lead.nextDate), 'parser: liczebniki słowne i data');
r = P('rozmawiałem z Ewą Kowalską z firmy Delta, chcą system za 120000 zł, szansa Delta CRM, etap negocjacje');
ok(r.contact.name === 'Ewa Kowalska' && r.deal.stage === 'Negocjacje' && r.deal.value === 120000, 'parser: odmiana imienia, etap, kwota w zł');

// UI flow
click('.split-mic');ok(E('vc.open')&&E("vc.phase")==='type','voice opens (type fallback without SR)');
click('[data-act="vc-example"][data-i="0"]');ok(d.querySelector('#vc-text').value.startsWith('Nowy lead'),'example fills');
click('[data-act="vc-process"]');await wait(50);ok(E("vc.phase")==='review'&&d.querySelectorAll('.vc-card.on').length===3,'review: '+d.querySelectorAll('.vc-card.on').length+' cards on');
click('[data-act="vc-save"]');
const l=E("db.lead[0]");ok(l.name==='Kwiaciarnia Róża'&&l.contacts.length===1&&l.source==='Polecenie'&&l.value===8000&&l.nextDate===E('addDays(1)'),'lead saved: '+JSON.stringify([l.name,l.source,l.value,l.nextStep,l.nextDate]));
ok(E(`find('company','${l.company}').city`)==='Kraków','company city');ok(E(`find('contact','${l.contacts[0]}').role`)==='Właścicielka','contact role');
ok(E("db.activity.find(a=>a.rid===db.lead[0].id&&a.type==='note').text").startsWith('Notatka głosowa'),'note logged');
// deal with existing company
E("openVoice('')");d.querySelector('#vc-text').value=E('VOICE_EX[1]');click('[data-act="vc-process"]');await wait(50);
ok(d.querySelector('.vc-match')&&d.body.textContent.includes('Istnieje w bazie'),'existing match shown');
click('[data-act="vc-save"]');const dd=E('db.deal[0]');ok(dd.company==='c1'&&dd.contacts[0]==='p1'&&dd.stage==='Oferta'&&dd.value===40000,'deal linked to existing: '+JSON.stringify([dd.name,dd.stage,dd.value,dd.nextDate]));
// hint from add form
E("openAdd('contact')");click('.voice-inline');ok(E("vc.hint")==='contact','hint from form');click('[data-act="vc-close"]');ok(!E('isModal()'),'close');
// dictate button present
click('[data-page="list"][data-obj="lead"]');click('[data-act="open"][data-obj="lead"][data-id="l6"]');ok(!!d.querySelector('#rec-composer .mic-mini'),'dictate in composer');

done(errs);
})();
