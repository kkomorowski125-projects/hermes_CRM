// Zmiany z audytu użyteczności: codzienna praca, telefon, nawyki, manager i komunikacja
const { boot, kit, ok, done } = require('./helpers');
const w = boot();
const { d, errs, click, submit, chg, txt, E } = kit(w);
click('[data-act="demo-quick"]');

/* etap 1: Na dziś na górze, szybkie akcje */
const html = d.querySelector('main').innerHTML;
ok(html.indexOf('<h2>Na dziś</h2>') < html.indexOf('Kluczowe wskaźniki') && html.indexOf('<h2>Na dziś</h2>') < html.indexOf('Zacznij tutaj'), 'Na dziś przed wskaźnikami i listą Zacznij tutaj');
ok(!!d.querySelector('.metrics.compact'), 'kompaktowe wskaźniki');
ok(d.querySelectorAll('.qa [data-qa="call"]').length > 0 && d.querySelectorAll('.qa [data-act="msg-open"]').length > 0, 'w Na dziś są przyciski Zadzwoń i Napisz');
ok(!d.querySelector('#topbar [data-act="import"]'), 'import poza górnym paskiem');
const id = E('db.deal.find(x => isOpen(x) && x.nextStep).id');
click(`.qa [data-act="done"][data-kind="step"][data-id="${id}"]`);
ok(!!d.querySelector('.ns-result') && /Jak poszło/.test(txt('.modal')), 'Zrobione pyta o wynik rozmowy');
click('[data-act="ns-out"][data-v="Rozmowa odbyta"]');
d.querySelector('#ns-note').value = 'Klient prosi o rabat 5%';
d.querySelector('#ns-text').value = 'Wysłać nową ofertę';
submit('#nextForm');
ok(E(`db.activity.some(a => a.rid === '${id}' && a.type === 'call' && a.outcome === 'Rozmowa odbyta' && a.text === 'Klient prosi o rabat 5%')`), 'wynik rozmowy zapisany w historii');
ok(E(`find('deal', '${id}').nextStep`) === 'Wysłać nową ofertę', 'kolejny krok ustawiony w tym samym oknie');

/* karta szansy */
E(`openRecord('deal', '${id}')`);
ok(!!d.querySelector('#rec-items.items-empty'), 'pusty panel produktów zwinięty');
ok(!d.querySelector('#rec-tl .tl-up'), 'następny krok nie dubluje się na osi czasu');
ok(/\d\s\d{3}/.test(d.querySelector('[data-edit="value"]').value), 'kwota w Szczegółach z odstępem tysięcy');
click('[data-act="atype"][data-t="call"][data-scope="rec"]');
ok(!!d.querySelector('#r-close') && d.querySelector('#r-close').checked, 'wpis rozmowy proponuje zamknięcie kroku');
d.querySelector('#ract-text').value = 'Rozmowa o rabacie';
click('[data-act="log"][data-scope="rec"]');
ok(/Krok zrobiony/.test(txt('.modal')) && !d.querySelector('.ns-result'), 'po wpisie od razu okno kolejnego kroku, bez ponownego pytania o wynik');
E('closeModal()');

/* wiadomości z szablonów */
click('[data-act="msg-open"]');
ok(/Napisz wiadomość/.test(txt('.modal')) && d.querySelectorAll('[data-act="msg-tpl"]').length >= 3, 'okno wiadomości z szablonami');
ok(!/\{\w+\}/.test(d.querySelector('#mg-body').value), 'pola szablonu uzupełnione');
const acts0 = E('db.activity.length');
submit('#msgForm');
ok(E('db.activity.length') === acts0 + 1 && E('db.activity[0].type') === 'email', 'wysłanie zapisuje email w historii');

/* etap 2: przegląd lejka, kolumny zamknięte, telefon */
E("state.page = 'pipeline'; state.pView = 'deal'; render()");
ok(!!d.querySelector('.kclosed') && !!d.querySelector('.kmini'), 'zamknięte szanse w wąskiej kolumnie');
const q = E('reviewQueue().length');
click('[data-act="review-start"]');
ok(q > 0 && /Przegląd lejka · 1 z/.test(txt('.modal')), 'przegląd lejka pokazuje pierwszą szansę');
click('[data-act="review-skip"]');
ok(/2 z/.test(txt('.modal')) || q === 1, 'pomiń przechodzi dalej');
click('[data-act="review-step"]');
d.querySelector('#ns-text').value = 'Zadzwonić po decyzję'; d.querySelector('#ns-date').value = E('addDays(2)');
submit('#nextForm');
ok(E('state.review') && E('state.review.done') === 1, 'po ustaleniu kroku przegląd wraca');
click('[data-act="review-end"]');
ok(!E('state.review') && E('settings.lastReview') === E('today'), 'zakończenie zapisuje datę przeglądu');
ok(!!d.querySelector('#mnav') && !!d.querySelector('#mnav .mfab'), 'dolne menu z przyciskiem dodawania (telefon)');

/* etap 3: zespół, prognoza, szablony, ustawienia */
ok(!!d.querySelector('.nav [data-page="team"]'), 'Zespół w menu, gdy jest kilka osób');
E(`find('deal', '${id}').forecast = 'Pewne'; find('deal', '${id}').close = today`);
E("state.page = 'team'; render()");
ok(/Pewne do końca miesiąca/.test(txt('.fc-strip')) && d.querySelectorAll('.team-t tbody tr').length >= 2, 'ekran Zespół z prognozą i lejkiem na osobę');
click('[data-act="team-sel"]');
ok(!!d.querySelector('.team-detail'), 'szczegóły osoby po kliknięciu');
d.querySelector('#actTgtForm [name="calls"]').value = '30'; submit('#actTgtForm');
ok(E('settings.activityTarget.calls') === 30 && !!d.querySelector('.act-t'), 'cel aktywności tygodniowej');
E("state.page = 'settings'; state.settingsObj = 'general'; render()");
ok(d.querySelectorAll('[data-act="stab"][role="tab"]').length === 5, 'pięć głównych zakładek Ustawień');
click('[data-act="stab"][data-obj="adv"]');
ok(E('state.settingsObj') === 'auto' && !!d.querySelector('.subtabs'), 'Zaawansowane z podzakładkami');
click('[data-act="stab"][data-obj="templates"]');
click('[data-act="tpl-add"]');
ok(E('settings.templates.length') === 6, 'nowy szablon');
chg(`[data-tpl="name"][data-id="${E('settings.templates[4].id')}"]`, 'Oferta wstępna');
ok(E('settings.templates[4].name') === 'Oferta wstępna', 'edycja nazwy szablonu');
/* uniwersalny przycisk Dodaj z menu */
E('closeModal(); state.page = "list"; state.obj = "deal"; render()');
ok(/Dodaj/.test(txt('#topbar [data-act="add-menu"]')) && !/Nowa szansa|Nowy lead/.test(txt('#topbar')), 'górny przycisk jest uniwersalny');
click('#topbar [data-act="add-menu"]');
ok(!d.querySelector('#addMenu').hidden && d.querySelectorAll('#addMenu .am-item').length === 6, 'menu: lead, szansa, firma, kontakt, spotkanie, głos');
ok(!!d.querySelector('#addMenu .am-item.cur[data-obj="deal"]'), 'menu wyróżnia obiekt z bieżącej strony');
click('#addMenu [data-obj="company"]');
ok(/Dodaj firmę/.test(txt('.modal')) && d.querySelector('#addMenu').hidden, 'wybór z menu otwiera formularz i zamyka menu');
E('closeModal()');
done(errs);
