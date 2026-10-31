// Faza 3: automatyzacje, masowe akcje, zapisane widoki, duplikaty, produkty i oferta, raport zespołu
const { boot, kit, ok, done } = require('./helpers');
const w = boot();
const { d, errs, click, submit, chg, txt, E } = kit(w);
click('[data-act="demo-quick"]');

/* automatyzacje */
E("state.page = 'settings'; state.settingsObj = 'auto'; render()");
ok(/Automatyzacje/.test(txt('main h2')) && d.querySelectorAll('[data-act="rule-tpl"]').length >= 3, 'zakładka Automatyzacje z gotowymi regułami');
click('[data-act="rule-tpl"][data-i="0"]');
ok(E('settings.rules.length') === 1 && E('settings.rules[0].on') === 'won', 'reguła z szablonu: po wygranej');
chg('#rf-on', 'stage');
d.querySelector('#rf-stage').value = 'Negocjacje';
d.querySelector('#rf-days').value = '2';
d.querySelector('#rf-title').value = 'Wysłać umowę do akceptacji';
submit('#ruleForm');
ok(E('settings.rules.length') === 2 && /Negocjacje/.test(txt('.rules')), 'własna reguła na wejście w etap');
const deal = E('db.deal.find(x => x.stage === "Oferta").id');
const tasks0 = E('db.task.length');
E(`setStage(find('deal', '${deal}'), 'Negocjacje')`); E('closeModal()');
ok(E('db.task.length') === tasks0 + 1 && E('db.task.at(-1).title') === 'Wysłać umowę do akceptacji' && E('db.task.at(-1).due') === E('addDays(2)'), 'wejście w etap tworzy zadanie z terminem');
E(`setStage(find('deal', '${deal}'), 'Wygrana')`);
ok(E('db.task.at(-1).title') === 'Wystawić fakturę i wysłać umowę', 'wygrana tworzy zadanie');
ok(E(`db.activity.some(a => a.rid === '${deal}' && /Automatyzacja/.test(a.text))`), 'automatyzacja w historii');
E("settings.rules.push({ id: 'rr', on: 'lead', do: 'owner', owner: '__rr' }); settings.team.push({ id: 'u2', name: 'Ola K.' })");
E("openAdd('lead')"); d.querySelector('#n-_company').value = 'Nowa Firma'; d.querySelector('#n-nextStep').value = 'Zadzwonić'; submit('#addForm');
ok(E('db.lead[0].name') === 'Nowa Firma' && E('db.lead[0].owner') !== '', 'nowy lead dostaje opiekuna z reguły');

/* masowe akcje */
E("state.page = 'list'; state.obj = 'deal'; state.filter.deal = 'open'; render()");
const n = d.querySelectorAll('[data-act="bsel"]').length;
click('[data-act="bsel-all"]');
ok(E('state.sel.ids.size') === n && /Zaznaczono: /.test(txt('.bulk')), 'zaznacz wszystkie i pasek akcji');
chg('[data-bulk="owner"]', 'Ola K.');
ok(E('db.deal.filter(x => isOpen(x) && x.owner === "Ola K.").length') === n, 'zmiana opiekuna dla zaznaczonych');
click('[data-act="toast-act"]');
ok(E('db.deal.filter(x => x.owner === "Ola K.").length') === 0, 'cofnięcie zmiany masowej');
const before = E('db.deal.length');
click(d.querySelectorAll('[data-act="bsel"]')[0]); click(d.querySelectorAll('[data-act="bsel"]')[1]);
click('[data-act="bulk-del"]'); click('[data-act="bulk-del"]');
ok(E('db.deal.length') === before - 2, 'usunięcie zaznaczonych');
click('[data-act="toast-act"]');
ok(E('db.deal.length') === before, 'cofnięcie usunięcia');

/* widoki */
E("state.lOwner = ''; state.q = 'sklep'; renderList()");
click('[data-act="view-save"]');
d.querySelector('#vf-name').value = 'Sklepy';
submit('#viewForm');
ok(E('settings.views.length') === 1 && /Sklepy/.test(txt('.views')), 'zapisany widok na liście');
E("state.q = ''; renderList()");
click('[data-act="view-apply"]');
ok(E('state.q') === 'sklep', 'widok przywraca wyszukiwanie');

/* duplikaty */
E("db.contact.push({ id: 'dupX', name: 'Kopia', email: db.contact[0].email.toUpperCase(), phone: '999', created: today })");
E("state.page = 'list'; state.obj = 'contact'; render()");
ok(!!d.querySelector('[data-act="dup-open"]'), 'przycisk duplikatów');
const c0 = E('db.contact.length');
click('[data-act="dup-open"]'); click('[data-act="dup-merge-all"]');
ok(E('db.contact.length') === c0 - 1 && !E('find("contact", "dupX")'), 'scalenie usuwa duplikat');

/* produkty i oferta */
E("state.page = 'settings'; state.settingsObj = 'products'; render()");
d.querySelector('#pf-name').value = 'Licencja roczna'; d.querySelector('#pf-price').value = '1 200,50'; submit('#prodForm');
ok(E('settings.products[0].price') === 1200.5, 'produkt w katalogu z ceną w formacie polskim');
const open = E('db.deal.find(isOpen).id');
E(`openRecord('deal', '${open}')`);
ok(!!d.querySelector('#rec-items'), 'panel Produkty i oferta na karcie szansy');
chg('[data-role="item-add"]', E('settings.products[0].id'));
chg('[data-item="qty"][data-i="0"]', '3');
chg('[data-item="discount"][data-i="0"]', '10');
ok(E(`find('deal', '${open}').value`) === 3241, 'wartość szansy z pozycji netto po rabacie');
ok(/3\s?241,35/.test(txt(".items-sum")), "suma netto w panelu");
click('[data-act="offer-preview"]');
ok(/Oferta handlowa/.test(txt('.offer-doc')) && /Licencja roczna/.test(txt('.offer-doc')), 'podgląd oferty do druku');
E('closeModal()');

/* raport zespołu */
E("state.page = 'analytics'; render()");
ok(!!d.querySelector('[data-act="team-csv"]'), 'eksport raportu zespołu w Analityce');
click('[data-act="team-csv"]');
ok(/raport zespołu/i.test(txt('#toast')), 'raport pobrany');
done(errs);
