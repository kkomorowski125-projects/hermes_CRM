// Importy z innych CRM: Pipedrive, HubSpot, Livespace (rozpoznanie kolumn, etapy, statusy, imię i nazwisko)
const { boot, kit, ok, done } = require('./helpers');
const w = boot();
const { d, errs, click, chg, txt, E } = kit(w);
const load = (obj, csv, name) => { E(`openImport('${obj}')`); E(`loadCSV(${JSON.stringify(csv)}, '${name}')`); };

const pipedrive = [
  'Deal - Title,Deal - Value,Deal - Stage,Deal - Status,Deal - Expected close date,Deal - Owner,Organization - Name,Person - Name,Person - Email,Person - Phone',
  'Wdrożenie CRM,24000,Proposal Made,open,2026-12-15,Kamil K.,Alfa Soft,Anna Nowak,anna@alfa.pl,501 100 200',
  'Strona www,8000,Negotiations Started,won,2026-10-10,Kamil K.,Beta Studio,Piotr Lis,piotr@beta.pl,',
  'Sklep online,15000,Lead In,lost,2026-09-01,Kamil K.,Gamma,Ewa Wójcik,ewa@gamma.pl,',
  'Audyt,5000,Demo Scheduled,open,15.11.2026,Kamil K.,Alfa Soft,Anna Nowak,anna@alfa.pl,'
].join('\n');
load('deal', pipedrive, 'deals-export.csv');
ok(/Rozpoznano eksport z Pipedrive/.test(txt('.modal')), 'rozpoznany eksport z Pipedrive');
ok(E('imp.map.join()') === 'name,value,stage,_status,close,owner,company,_cname,_cemail,_cphone', 'kolumny Pipedrive dopasowane automatycznie');
ok(!!d.querySelector('[data-smap]'), 'mapowanie etapów widoczne');
ok(E('imp.stageMap[norm("Proposal Made")]') === 'Oferta' && E('imp.stageMap[norm("Negotiations Started")]') === 'Negocjacje' && E('imp.stageMap[norm("Lead In")]') === 'Nowe', 'etapy zgadnięte po słowach kluczowych');
chg('[data-smap="demo scheduled"]', 'Kontakt');
click('[data-act="imp-run"]');
ok(E('db.deal.length') === 4, 'zaimportowano 4 szanse');
const by = n => `db.deal.find(x => x.name === '${n}')`;
ok(E(`${by('Wdrożenie CRM')}.stage`) === 'Oferta' && E(`${by('Wdrożenie CRM')}.value`) === 24000, 'etap i wartość');
ok(E(`${by('Strona www')}.stage`) === 'Wygrana' && E(`${by('Sklep online')}.stage`) === 'Przegrana', 'status won i lost zamyka szanse');
ok(E(`${by('Audyt')}.stage`) === 'Kontakt' && E(`${by('Audyt')}.close`) === '2026-11-15', 'ręczne mapowanie etapu i data w formacie polskim');
ok(E('db.company.length') === 3 && E('db.contact.length') === 3, 'firmy i osoby bez duplikatów');
ok(E(`${by('Wdrożenie CRM')}.nextStep`) && E(`${by('Wdrożenie CRM')}.nextDate`) === E('today'), 'otwarte szanse dostają następny krok');
ok(E(`db.activity.some(a => a.rid === ${by('Audyt')}.id && /Pipedrive/.test(a.text))`), 'wpis w historii o imporcie');

const hubspot = ['Record ID,Deal Name,Amount,Deal Stage,Close Date,Deal owner,Associated Company,Associated Contact',
  '901,Abonament roczny,12000.50,closedwon,2026-10-02 14:00,Kamil K.,Delta,Jan Kos',
  '902,Pilotaż,3000,presentationscheduled,2026-11-30 10:00,Kamil K.,Delta,Jan Kos'].join('\n');
load('deal', hubspot, 'hubspot-deals.csv');
ok(/HubSpot/.test(txt('.modal')), 'rozpoznany eksport z HubSpot');
click('[data-act="imp-run"]');
ok(E(`${by('Abonament roczny')}.stage`) === 'Wygrana' && E(`${by('Abonament roczny')}.value`) === 12000.5, 'etap closedwon i kwota z kropką');
ok(E(`${by('Pilotaż')}.stage`) === 'Oferta' && E(`${by('Pilotaż')}.close`) === '2026-11-30', 'etap prezentacji i data z godziną');

const contacts = ['First Name,Last Name,Email,Phone Number,Company Name,Job Title',
  'Maria,Zając,maria@delta.pl,600 700 800,Delta,Dyrektor sprzedaży',
  'Anna,Nowak,anna@alfa.pl,,Alfa Soft,Prezes'].join('\n');
load('contact', contacts, 'hubspot-contacts.csv');
click('[data-act="imp-run"]');
ok(E('db.contact.some(c => c.name === "Maria Zając" && c.role === "Dyrektor sprzedaży" && c.phone === "600 700 800")'), 'imię i nazwisko z dwóch kolumn');
ok(E('db.contact.filter(c => c.email === "anna@alfa.pl").length') === 1, 'istniejący kontakt pominięty jako duplikat');
done(errs);
