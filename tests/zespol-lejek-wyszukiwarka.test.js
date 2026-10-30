// Zespół, edycja etapów, lejek leadów, siatka analityki, wyszukiwarka, typografia
const { boot, kit, ok, wait, done } = require('./helpers');
let w = boot();
let { d, errs, click, submit, chg, inp, key, txt, E } = kit(w);
click('[data-act="demo-quick"]');
ok(!/[—–]/.test(d.body.textContent),'no dashes on Pulpit');
// team
click('[data-act="go"][data-page="settings"]');click('[data-act="stab"][data-obj="team"]');
ok(d.querySelectorAll('.settings tbody tr').length===2,'team rows (me + Monika)');
d.querySelector('#tf-name').value='Ola Lis';d.querySelector('#tf-target').value='30 000';submit('#teamForm');
ok(E("settings.team.some(u=>u.name==='Ola Lis'&&u.target===30000)"),'add salesperson');
const mon=E("settings.team.find(u=>u.name==='Monika N.').id");chg(`#tm-n-${mon}`,'Monika Nowak');ok(E("db.deal.filter(d=>d.owner==='Monika Nowak').length")>0,'rename propagates owner');
const ola=E("settings.team.find(u=>u.name==='Ola Lis').id");click(`[data-act="team-del"][data-id="${ola}"]`);click(`[data-act="team-del"][data-id="${ola}"]`);ok(!E("settings.team.some(u=>u.name==='Ola Lis')"),'delete salesperson');
// owner in forms/lists
E("openAdd('deal')");ok(!!d.querySelector('#n-owner'),'owner select in add form');E('closeModal()');
click('[data-page="list"][data-obj="deal"]');ok(!!d.querySelector('[data-role="lowner"]'),'list owner filter');chg('[data-role="lowner"]','Monika Nowak');ok([...d.querySelectorAll('#rows tbody tr')].length===E("db.deal.filter(d=>isOpen(d)&&d.owner==='Monika Nowak').length"),'owner filter works');chg('[data-role="lowner"]','');
// stages
click('[data-act="go"][data-page="settings"]');click('[data-act="stab"][data-obj="stages"]');
chg('#st-n-2','Propozycja');ok(E("db.deal.filter(d=>d.stage==='Propozycja').length")===2&&E("field('deal','stage').options.some(o=>o[0]==='Propozycja')"),'rename stage moves deals');
d.querySelector('#sf-name').value='Demo';d.querySelector('#sf-prob').value='35';d.querySelector('#sf-pos').value='2';submit('#stageForm');ok(E("openStages().join()")==='Nowe,Kontakt,Demo,Propozycja,Negocjacje','add stage at position');
click('[data-act="stage-move"][data-i="2"][data-d="1"]');ok(E("openStages()[3]")==='Demo','move stage');
click('[data-act="stage-del"][data-i="0"]');click('[data-act="stage-del"][data-i="0"]');ok(!E("openStages().includes('Nowe')")&&E("db.deal.filter(d=>d.stage==='Nowe').length")===0,'delete stage moves deals');
click('[data-act="toast-act"]');ok(E("openStages()[0]")==='Nowe','undo delete stage');
click('[data-act="go"][data-page="pipeline"]');ok(d.querySelectorAll('.kcol').length===E('openStages().length')+1,'kanban uses custom stages');
// lead pipeline
click('[data-act="pview"][data-v="lead"]');ok(txt('h1').startsWith('Lejek leadów')&&d.querySelectorAll('.lead-card').length>0,'lead pipeline: '+d.querySelectorAll('.kcol').length+' cols');
const ev=(type,el,id)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});e.dataTransfer={data:{},setData(k,v){this.data[k]=v},getData(k){return this.data[k]||id},files:[]};e.clientX=0;e.clientY=0;el.dispatchEvent(e);return e;};
ev('drop',d.querySelector('.kcol[data-status="Kwalifikacja"]'),'lead:l2');ok(E("find('lead','l2').status")==='Kwalifikacja'&&E('modalLock'),'drag lead → status + step modal');click('[data-act="step-skip"]');
ev('drop',d.querySelector('.kcol[data-status="Skonwertowany"]'),'lead:l2');ok(!!d.querySelector('#convForm'),'drop on Szansa opens convert');E('closeModal()');
// analytics grid
click('[data-act="go"][data-page="analytics"]');ok(d.querySelectorAll('.mod').length===8,'8 default modules');
click('[data-act="aedit"]');ok(!!d.querySelector('.mgrid.editing')&&d.querySelectorAll('[data-act="mod-add"]').length===3,'edit mode with 3 extra modules');
click('[data-act="mod-add"][data-id="funnel"]');ok(!!d.querySelector('[data-mod="funnel"] .funnel'),'add funnel module');
click('[data-act="mod-del"][data-id="team"]');ok(!d.querySelector('[data-mod="team"]'),'remove module');
click('[data-act="mod-w"][data-id="chart"][data-w="12"]');ok(d.querySelector('[data-mod="chart"]').classList.contains('w12'),'resize module');
ev('drop',d.querySelector('[data-mod="kpis"]'),'mod:lost'); // without dragMod set → treated as kanban; simulate dragMod
E("dragMod='lost'");const tgt=d.querySelector('[data-mod="kpis"]');tgt.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});tgt.parentNode.getBoundingClientRect=()=>({width:100});ev('drop',tgt,'');
ok(E("aLayout()[0].id")==='lost','drag module to top');
click('[data-act="mod-reset"]');ok(E("aLayout().length")===8,'reset layout');click('[data-act="aedit"]');
// search
E('openCmd()');inp('#cmdq','ponton');ok(txt('#cmdres').includes('Drukarnia Ponton')&&!!d.querySelector('#cmdres mark'),'search highlight');
ok(d.querySelectorAll('#cmdscopes .chip-btn').length>1,'scopes: '+txt('#cmdscopes'));
const q=d.querySelector('#cmdq');key(q,'ArrowDown');ok(E('state.cmdI')===1,'arrow nav');key(q,'Tab');ok(E('state.cmdScope')!=='all','tab scope: '+E('state.cmdScope'));
inp('#cmdq','602 114');ok(txt('#cmdres').includes('Jan Dąb'),'phone search');
inp('#cmdq','wycen');ok(txt('#cmdscopes').includes('Historia'),'activity search');
inp('#cmdq','zzzqx');ok(!!d.querySelector('.cmd-empty'),'empty state');click('[data-act="cmd-create"][data-obj="lead"]');ok(d.querySelector('#n-_company').value==='zzzqx','create from search');E('closeModal()');
key(d.body,'/');ok(!!d.querySelector('#cmdq'),'slash opens search');E('closeModal()');
// typography
ok(/ /.test(d.body.textContent),'nbsp applied');
ok(!/[—–]/.test(d.body.innerHTML.replace(/<script[\s\S]*?<\/script>/g,'')),'no dashes in DOM');
for(const pg of ['overview','pipeline','analytics','settings']){click(`[data-act="go"][data-page="${pg}"]`);if(/[—–]/.test(d.querySelector('#main').textContent))console.log('DASH on',pg);}
click('[data-page="list"][data-obj="lead"]');click('[data-act="open"][data-obj="lead"][data-id="l6"]');if(/[—–]/.test(d.querySelector('#main').textContent))console.log('DASH on record');
done(errs);
