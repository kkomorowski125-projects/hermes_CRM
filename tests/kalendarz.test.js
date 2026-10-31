// Kalendarz i umawianie spotkań: wolne terminy, okno „Umów spotkanie”, podgląd strony dla klienta, odbyte i odwołane spotkania
const { boot, kit, ok, done } = require('./helpers');
const w = boot();
const { d, errs, click, submit, chg, txt, E } = kit(w);
click('[data-act="demo-quick"]');

/* nawigacja i pusta agenda */
ok(!!d.querySelector('[data-page="calendar"]'), 'Kalendarz w menu');
click('[data-page="calendar"]');
ok(E('state.page') === 'calendar' && /Kalendarz/.test(txt('main h1')), 'strona Kalendarz');
ok(/Link działa, gdy Hermes jest uruchomiony na serwerze/.test(txt('main')), 'bez serwera: wyjaśnienie i podgląd');

/* wolne terminy: dni robocze, godziny, wyprzedzenie, bufor */
const slots = E(`bkSlots({ ...BK_DEF, from: '09:00', to: '11:00', duration: 30, buffer: 15, notice: 0, horizon: 14 }, [], new Date(2026, 10, 2, 8, 0).getTime())`);
ok(slots[0].day === '2026-11-02' && slots[0].times.join(',') === '2026-11-02T09:00,2026-11-02T09:30,2026-11-02T10:00,2026-11-02T10:30', 'poniedziałek: co 30 minut od 9:00 do 10:30');
ok(!slots.some(s => s.day === '2026-11-07' || s.day === '2026-11-08'), 'bez weekendu');
const busy = [{ s: new Date(2026, 10, 3, 10, 0).getTime(), e: new Date(2026, 10, 3, 10, 30).getTime() }];
const tue = E(`bkSlots({ ...BK_DEF, from: '09:00', to: '11:00', duration: 30, buffer: 15, notice: 0, horizon: 3 }, ${JSON.stringify(busy)}, new Date(2026, 10, 2, 8, 0).getTime())`).find(s => s.day === '2026-11-03');
ok(tue.times.join(',') === '2026-11-03T09:00', 'bufor 15 minut wokół zajętego spotkania');
ok(E(`daysLabel([1,2,3,4,5])`) === 'pon. do pt.' && E(`daysLabel([1,3])`) === 'pon., śr.', 'opis dni bez myślników');

/* ustawienia dostępności */
click('[data-act="cal-settings"]');
ok(!!d.querySelector('#bkSetForm'), 'okno dostępności');
d.querySelector('#bk-title').value = 'Rozmowa wstępna';
d.querySelector('#bk-from').value = '08:00'; d.querySelector('#bk-to').value = '18:00';
d.querySelector('#bk-not').value = '0';
d.querySelectorAll('#bkSetForm input[name="days"]').forEach(x => { x.checked = true; });
submit('#bkSetForm');
ok(E('settings.booking.title') === 'Rozmowa wstępna' && E('settings.booking.days.length') === 7 && E('settings.booking.from') === '08:00', 'dostępność zapisana');
ok(/Rozmowa wstępna/.test(txt('.cal-side')) && /pon\. do niedz\./.test(txt('.cal-side')), 'podsumowanie w panelu linku');

/* umów spotkanie z karty szansy */
const id = E(`db.deal.find(x => isOpen(x) && contactsOf(x).some(c => c.email)).id`);
E(`find('deal', '${id}').nextDate = addDays(30)`);
E(`openRecord('deal', '${id}')`);
click(`[data-act="appt-new"][data-obj="deal"][data-id="${id}"]`);
ok(!!d.querySelector('#schForm') && d.querySelectorAll('#schForm .day-chip').length > 0, 'okno z dniami z dostępności');
const day2 = d.querySelectorAll('#schForm .day-chip')[1].dataset.d;
click(`#schForm .day-chip[data-d="${day2}"]`);
const t1 = d.querySelectorAll('#schForm .sch-times .chip-btn')[2];
const at1 = t1.dataset.t;
click(t1);
ok(d.querySelector('#sch-d').value === at1.slice(0, 10) && d.querySelector('#sch-t').value === at1.slice(11, 16), 'wybór godziny wypełnia dzień i czas');
d.querySelector('#sch-title').value = 'Demo produktu';
submit('#schForm');
const appt = E(`db.activity.find(a => a.type === 'appt' && a.rid === '${id}')`);
ok(appt && appt.at === at1 && appt.by === E('me()') && appt.end > appt.at, 'spotkanie zapisane w CRM z godziną końca');
ok(E(`find('deal', '${id}').nextDate`) === at1.slice(0, 10) && /^Demo produktu/.test(E(`find('deal', '${id}').nextStep`)), 'następny krok w dniu spotkania');
ok(/Spotkanie zapisane/.test(txt('.modal')) && !!d.querySelector('[data-act="appt-invite"]'), 'potwierdzenie z wysyłką zaproszenia');
const icsText = E(`apptIcs(db.activity.find(a => a.id === '${appt.id}'), apptPerson(db.activity.find(a => a.id === '${appt.id}')))`);
ok(/BEGIN:VEVENT/.test(icsText) && /DTSTART:\d{8}T\d{6}Z/.test(icsText) && /ATTENDEE/.test(icsText), 'zaproszenie .ics z uczestnikiem');
click('[data-act="close-modal"]');
ok(!E(`bkSlots().some(x => x.times.includes('${at1}'))`), 'zajęty termin znika z wolnych');
ok(/Zaplanowane/.test(txt('#rec-tl')) && !!d.querySelector('#rec-tl [data-act="appt-done"]'), 'spotkanie na osi czasu z akcjami');
ok(E(`lastTouch('deal', find('deal', '${id}'))`) !== appt.at, 'zaplanowane spotkanie nie liczy się jako ostatni kontakt');

/* kalendarz pokazuje spotkanie */
click('[data-page="calendar"]');
ok(/Demo produktu/.test(txt('.agenda')), 'spotkanie w agendzie');

/* odbyło się: zamienia się w spotkanie w historii i pyta o kolejny krok */
click(`.agenda [data-act="appt-cancel"][data-id="${appt.id}"]`);
ok(E(`db.activity.find(a => a.id === '${appt.id}').cancelled`) === true, 'odwołanie oznacza spotkanie');
ok(E(`find('deal', '${id}').nextStep`) === 'Ustalić nowy termin spotkania', 'po odwołaniu krok: nowy termin');
ok(E(`bkSlots().some(x => x.times.includes('${at1}'))`), 'termin znowu wolny');

/* podgląd strony klienta: nowa osoba zakłada leada */
click('[data-act="cal-preview"]');
const pt = d.querySelector('#bkPrevForm .sch-times .chip-btn');
const at2 = pt.dataset.t;
click(pt);
d.querySelector('#bkp-name').value = 'Ola Testowa';
d.querySelector('#bkp-email').value = 'ola@nowafirma.pl';
d.querySelector('#bkp-co').value = 'Nowa Firma';
d.querySelector('#bkp-topic').value = 'Cennik';
submit('#bkPrevForm');
const lead = E(`db.lead.find(l => l.source === 'Kalendarz')`);
ok(lead && lead.name === 'Nowa Firma' && lead.nextDate === at2.slice(0, 10), 'nowy lead ze źródłem Kalendarz i krokiem na spotkanie');
ok(E(`db.contact.some(c => c.email === 'ola@nowafirma.pl')`) && E(`db.company.some(c => c.name === 'Nowa Firma')`), 'nowy kontakt i firma');
const a2 = E(`db.activity.find(a => a.type === 'appt' && a.rid === '${lead.id}')`);
ok(a2 && a2.via === 'booking' && a2.at === at2 && a2.text === 'Rozmowa wstępna: Cennik', 'spotkanie z podglądu oznaczone jako umówione przez link');
ok(/Przez link/.test(txt('.agenda')), 'agenda oznacza spotkania z linku');

/* spotkanie dziś w Na dziś, odbyte spotkanie liczy się jako kontakt */
E(`(() => { const a = db.activity.find(x => x.id === '${a2.id}'); a.at = today + 'T07:00'; a.end = today + 'T07:30'; })()`);
click('[data-page="overview"]');
ok(!!d.querySelector('.today-appts .ta') && /Rozmowa wstępna/.test(txt('.today-appts')), 'spotkania dziś nad listą Na dziś');
click('[data-page="calendar"]');
click(`[data-act="appt-done"][data-id="${a2.id}"]`);
ok(E(`db.activity.find(a => a.id === '${a2.id}').type`) === 'meeting', 'odbyte spotkanie trafia do historii jako spotkanie');
ok(!!d.querySelector('#nextForm'), 'po spotkaniu pyta o kolejny krok');
click('[data-act="step-skip"]');

/* szablon z linkiem */
ok(E(`templates().some(t => /\\{link_kalendarza\\}/.test(t.body))`), 'szablon Wybór terminu');
ok(/\[link do kalendarza\]/.test(E(`fillTpl('{link_kalendarza}', 'deal', find('deal', '${id}'), null)`)), 'bez serwera wstawia znacznik linku');

/* bez myślników w nowym widoku */
click('[data-page="calendar"]');
ok(!/ [-–—] /.test(txt('main')), 'bez myślników jako interpunkcji');
ok(!errs.length, 'bez błędów w konsoli: ' + errs.join(' | '));
done();
