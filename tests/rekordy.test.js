// Leady, szanse, karty rekordów, powiązania, konwersja, import, migracja danych
const { boot, kit, ok, wait, done } = require('./helpers');
let w = boot();
let { d, errs, click, submit, chg, inp, key, txt, E } = kit(w);
(async()=>{
for(const pg of ['overview','pipeline','analytics','settings'])click(`[data-act="go"][data-page="${pg}"]`);
for(const o of ['company','contact','lead','deal'])click(`[data-page="list"][data-obj="${o}"]`);
ok(txt('#rows .empty h3')==='Brak rekordów','empty lists');
click('[data-act="go"][data-page="overview"]');click('[data-act="demo-quick"]');
ok(E('db.lead.length')===6&&E('db.deal.length')===14,'demo loaded');
ok(txt('.metrics').includes('Prognoza ważona'),'weighted metric: '+txt('.metrics .metric:nth-child(2) strong'));
ok(d.querySelectorAll('.task .kind-pill').length>0,'lead tasks on Pulpit: '+d.querySelectorAll('.task .kind-pill').length);
// lists
click('[data-page="list"][data-obj="lead"]');ok(d.querySelectorAll('#rows tbody tr').length===4,'open leads filter: '+d.querySelectorAll('#rows tbody tr').length);
click('[data-act="lfilter"][data-v="all"]');ok(d.querySelectorAll('#rows tbody tr').length===6,'all leads');
ok(!!d.querySelector('.wait'),'speed-to-lead flag: '+txt('.wait'));
click('[data-act="sort"][data-k="value"]');click('[data-act="sort"][data-k="value"]');ok(txt('#rows tbody tr .identity b')==='Szkoła Językowa Lingua','sort desc by value');
click('[data-page="list"][data-obj="deal"]');ok(d.querySelectorAll('#rows tbody tr').length===10,'open deals: '+d.querySelectorAll('#rows tbody tr').length);
ok(txt('#rows tbody').includes('+1'),'multi-contact chip');
click('[data-page="list"][data-obj="company"]');click('[data-act="lfilter"][data-v="pipe"]');console.log('  companies w/ pipe',d.querySelectorAll('#rows tbody tr').length);
// lead record
click('[data-page="list"][data-obj="lead"]');click('[data-act="open"][data-obj="lead"][data-id="l6"]');
ok(E('state.page')==='record'&&!!d.querySelector('.stagebar'),'lead record page');
ok(d.querySelectorAll('.rec-side .assoc').length===3,'company + 2 contacts: '+d.querySelectorAll('.rec-side .assoc').length);
ok(txt('.crumbs').includes('Leady'),'crumbs: '+txt('.crumbs'));
// complete step → locked; skip X
click('.rec-next [data-act="done"]');ok(E('modalLock')&&!!d.querySelector('[data-act="step-skip"]'),'locked complete modal with X');
ok(!!d.querySelector('[data-act="step-convert"]'),'lead close-row convert');
click('[data-act="step-skip"]');ok(!E('isModal()')&&E("find('lead','l6').nextStep")==='','skip clears step');
ok(E("db.activity.slice(0,2).map(a=>a.type).join()")==='system,task','skip logged');
// set step via nextstep
click('[data-act="nextstep"][data-obj="lead"]');d.querySelector('#ns-text').value='Demo dla dyrektorki';submit('#nextForm');ok(E("find('lead','l6').nextStep")==='Demo dla dyrektorki','set lead step');
// convert
click('[data-act="rec-convert"]');submit('#convForm');ok(d.querySelector('#cvErr').className==='warn','convert needs ICP+interest');
d.querySelector('[name="interest"]').checked=true;d.querySelector('#cv-value').value='18 000';submit('#convForm');
const nd=E("db.deal[0]");ok(nd.leadId==='l6'&&nd.contacts.length===2&&nd.value===18000,'deal created from lead');
ok(E("find('lead','l6').status")==='Skonwertowany'&&E("state.rec.obj")==='deal','lead converted & navigated');
ok(txt('.rec-main').includes('Skonwertowano'),'deal timeline shows lead history');
// associations
click('[data-act="pick"][data-kind="contact"]');inp('[data-role="pick"]','Nowa Osoba');click('[data-act="pick-create"]');
ok(E("db.deal[0].contacts.length")===3,'create+link contact');
const pre0=E('db.deal[0].contacts[1]');click('[data-act="make-primary"]');ok(E('db.deal[0].contacts[0]')===pre0,'make primary real');ok(true,'make primary (see contacts order)');
click('[data-act="unlink-contact"]');ok(E("db.deal[0].contacts.length")===2,'unlink');click('[data-act="toast-act"]');ok(E("db.deal[0].contacts.length")===3,'unlink undo');
click('[data-act="pick"][data-kind="company"]');inp('[data-role="pick"]','Meble');click('.pick-row[data-act="pick-link"]');ok(E("db.deal[0].company")==='c1','change company via picker');
// composer
click('[data-act="atype"][data-scope="rec"][data-t="call"]');ok(!!d.querySelector('.outcomes'),'outcomes visible');
click('[data-act="outcome"][data-v="Nie odebrał(a)"]');click('[data-act="log"][data-scope="rec"]');
ok(E("db.activity[0].outcome")==='Nie odebrał(a)'&&!!E("db.activity[0].who"),'call logged with outcome & who');
click('[data-act="tlf"][data-v="call"]');ok([...d.querySelectorAll('#rec-tl .timeline li')].every(li=>li.className==='t-call'),'timeline filter');
// won / reopen
const id=nd.id;click('[data-act="rec-won"]');ok(E(`find('deal','${id}').stage`)==='Wygrana'&&!!d.querySelector('.banner.ok'),'won + banner');
click('[data-act="rec-reopen"]');ok(E('modalLock'),'reopen asks for step');click('[data-act="step-cancel"]');ok(E(`find('deal','${id}').stage`)==='Wygrana','cancel reverts');
// stagebar on deal d2
click('[data-act="go"][data-page="pipeline"]');click('[data-act="open"][data-id="d2"]');click('[data-act="rec-stage"][data-v="Oferta"]');ok(E('modalLock'),'stagebar → step modal');
click('[data-act="step-skip"]');ok(E("find('deal','d2').stage")==='Oferta','skip keeps stage');
ok(txt('.crumbs').startsWith('Lejek'),'back crumb from pipeline');
// Esc back
d.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));ok(E('state.page')==='pipeline','Esc → back');
// disqualify
click('[data-page="list"][data-obj="lead"]');click('[data-act="open"][data-id="l1"]');click('[data-act="rec-disq"]');submit('#disqForm');ok(d.querySelector('#disqErr').className==='warn','disq needs reason');
d.querySelector('[name="reason"][value="Brak budżetu"]').checked=true;submit('#disqForm');ok(E("find('lead','l1').status")==='Odrzucony','disqualified');
click('[data-act="toast-act"]');ok(E("find('lead','l1').status")==='Nowy','disq undo');
// status from Nowy → log call auto W kontakcie
click('[data-act="atype"][data-scope="rec"][data-t="call"]');d.querySelector('#ract-text').value='Rozmowa ok';click('[data-act="log"][data-scope="rec"]');ok(E("find('lead','l1').status")==='W kontakcie','first call → W kontakcie');
// delete record + undo
click('.rh-acts [data-act="del"]');ok(E('state.page')==='list'&&!E("find('lead','l1')"),'delete lead');click('[data-act="toast-act"]');ok(E('state.page')==='record','undo delete');
// quick add lead
click('[data-act="go"][data-page="overview"]');click('.top-actions [data-act="add"]');ok(d.querySelector('#addForm').dataset.obj==='lead','overview add = lead');
d.querySelector('#n-_company').value='Firma Testowa';d.querySelector('#n-_cname').value='Ala Kot';d.querySelector('#n-_cemail').value='ala@test.pl';submit('#addForm');
const L=E('db.lead[0]');ok(L.name==='Firma Testowa'&&L.contacts.length===1&&E(`nameOf('company','${L.company}')`)==='Firma Testowa','quick lead creates company+contact');
// quick add deal from contact drawer
click('[data-page="list"][data-obj="contact"]');click('[data-act="open"][data-obj="contact"][data-id="p1"]');click('.drawer [data-act="add"][data-obj="deal"]');
ok(d.querySelector('#n-_cname').value==='Jan Dąb','preset contact');d.querySelector('#n-name').value='Nowa szafa';d.querySelector('#n-nextStep').value='Wycena';submit('#addForm');
ok(E("db.deal[0].contacts[0]")==='p1'&&E("db.deal[0].company")==='c1','deal from contact');
ok(txt('.drawer').includes('Nowa szafa'),'drawer lists new deal');
click('[data-act="close-drawer"]');
// import leads
E("openImport('lead')");d.querySelector('#csvpaste').value='Firma;Osoba kontaktowa;E-mail;Źródło\nAlfa Sp.;Ola Nowak;ola@alfa.pl;Polecenie';click('[data-act="imp-paste"]');
ok(E("imp.map.join()")==='company,_cname,_cemail,source','import automap: '+E("imp.map.join()"));click('[data-act="imp-run"]');
const IL=E("db.lead.find(l=>l.name==='Alfa Sp.')");ok(IL&&IL.contacts.length===1,'import lead with contact');
// cmdk recent
E('openCmd()');ok(txt('#cmdres').includes('Ostatnio otwierane'),'cmdk recent');E('closeModal()');
// AI
click('.ai-button');d.querySelector('#ai-input').value='Którym leadem zająć się najpierw?';submit('#aiForm');await wait(500);
ok(txt('#ai-body').includes('Kolejność'),'AI leads');click('[data-act="ai-close"]');
click('[data-page="list"][data-obj="deal"]');click('[data-act="open"][data-id="d3"]');click('.rh-acts [data-act="ai-rec"]');d.querySelector('#ai-input').value='Podsumuj tę szansę';submit('#aiForm');await wait(500);
ok(txt('#ai-body').includes('Paweł Kos'),'AI summary lists contacts');click('[data-act="ai-close"]');
// analytics, export
click('[data-act="go"][data-page="analytics"]');ok(txt('.kpis').includes('Konwersja leadów'),'analytics renders');
E("exportCSV('lead')");E("exportCSV('deal')");
ok(!!w.localStorage.getItem('hermes-crm-v3'),'saved v3');

// migration from v2
const old={app:'hermes-crm',v:1,db:{company:[{id:'c1',name:'Stara Firma'}],contact:[{id:'p1',name:'Jan',company:'c1'}],lead:[{id:'l1',name:'Ewa Lis',companyName:'Lis i S-ka',email:'ewa@lis.pl',phone:'1',source:'Targi',status:'Zakwalifikowany'}],deal:[{id:'d1',name:'X',company:'c1',contact:'p1',value:5,stage:'Oferta'}],activity:[]},settings:{userName:'Kamil'},labels:{lead:{name:'Imię i nazwisko'}}};
w=boot(win=>win.localStorage.setItem('hermes-crm-v2',JSON.stringify(old)));d=w.document;const e2=[];w.addEventListener('error',e=>e2.push(e.message));
const ml=w.eval('db.lead[0]');ok(ml.name==='Lis i S-ka'&&ml.contacts.length===1&&ml.status==='Skonwertowany'&&w.eval(`nameOf('contact','${ml.contacts[0]}')`)==='Ewa Lis','migrate lead');
ok(JSON.stringify(w.eval('db.deal[0].contacts'))==='["p1"]','migrate deal contacts');ok(w.eval("field('lead','name').label")==='Nazwa leada','old lead labels dropped');
w.eval("state.page='list';state.obj='lead';render()");w.eval("openRecord('lead','l1')");errs.push(...e2);
done(errs);
})();
