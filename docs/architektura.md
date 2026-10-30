# Architektura

Hermes to jedna strona HTML z czystym JavaScriptem: bez frameworka, bez kroku budowania i bez serwera. Stan aplikacji żyje w kilku obiektach w pamięci, a każdy ekran jest funkcją, która zamienia ten stan w HTML.

## Zasady

1. **Jeden plik.** `index.html` zawiera style (`<style>`), szkielet strony i cały skrypt (`<script>`). Otwierasz go w przeglądarce i działa.
2. **Renderowanie z ciągów znaków.** Funkcje `render…()` składają HTML w template stringach i podmieniają `innerHTML` kontenera. Każda wartość od użytkownika przechodzi przez `esc()`.
3. **Jedna obsługa zdarzeń.** Kliknięcia, wysyłki formularzy, zmiany pól i klawisze obsługują cztery nasłuchiwacze na `document`. Elementy mówią, co robić, przez atrybut `data-act`.
4. **Zapis po każdym renderze.** `renderMain()` kończy się wywołaniem `save()`, więc dane trafiają do `localStorage` po każdej zmianie widoku.

## Szkielet strony

```
<aside id="side">        menu boczne        renderSide()
<header id="topbar">     górny pasek        renderTop()
<main id="main">         bieżący ekran      renderMain() → render<Ekran>()
<div id="drawerLayer">   panel firmy lub kontaktu   renderDrawer()
<div id="aiLayer">       panel Hermes AI    renderAI()
<div id="modalLayer">    okna dialogowe     modal(html)
<div id="toast">         powiadomienia      toast(msg, akcja)
```

`render()` odświeża menu, górny pasek i bieżący ekran. Panele i okna mają osobne funkcje, bo żyją niezależnie od ekranu.

## Moduły w skrypcie

Skrypt jest podzielony komentarzami `/* ===== nazwa ===== */`. Kolejność ma znaczenie, bo stałe są definiowane przed użyciem.

| Sekcja | Odpowiada za |
| --- | --- |
| helpers | `esc`, `uid`, `norm` (porównywanie bez polskich znaków), daty (`addDays`, `rel`, `fdate`), kwoty (`money`, `kzl`), `plural` |
| icons & logo | Ikony SVG (`ic(nazwa)`), logo, iskra AI |
| objects | `SCHEMA` czterech obiektów, aliasy importu, etapy lejka, statusy leadów, `resolveCompany`, `resolveContact` |
| demo data | `demoData()`: firmy, osoby, leady, szanse i historia względem dzisiejszej daty |
| persistence | `snapshot`, `save`, `load`, `applyState`, migracja z wersji 2 (`migrateDb`) |
| activity | `logAct`, `actsOf` (historia z powiązanych rekordów), `lastTouch`, `leadWait` |
| state | Obiekt `state`: bieżący ekran, filtry, sortowanie, rekord, okresy |
| atoms | Awatary, tagi, komórki tabel, kontrolki formularzy |
| shell | Menu, górny pasek, nagłówki stron |
| overview | Pulpit, `todayItems()`, lista „Zacznij tutaj” |
| pipeline | Kanban szans i karty |
| directory | Listy obiektów: kolumny, filtry, sortowanie |
| analytics | Rejestr modułów, lejek leadów, wyszukiwarka, okresy raportowe, `renderAnalytics` |
| settings | Ogólne, zespół, etapy lejka, pola obiektów |
| timeline, drawer, record page | Oś czasu, panel firmy i kontaktu, karta leada i szansy z powiązaniami |
| modals | Formularze dodawania, następny krok, konwersja, odrzucenie, przegrana |
| CSV import / export | Parser CSV, dopasowanie kolumn, import, szablon, eksport |
| Hermes AI | Panel czatu, tryb lokalny, połączenie z Claude API |
| voice input | Hermes Voice: rozpoznawanie mowy, parser, podgląd, zapis, dyktowanie |
| actions | Logika akcji i nasłuchiwacze zdarzeń |
| typography | Twarde spacje po krótkich słowach |

## Przepływ akcji

```
klik w element z data-act="rec-won"
  → nasłuchiwacz click na document
  → switch (a) { case 'rec-won': setStage(rekord, 'Wygrana') }
  → zmiana danych w db + logAct(...)
  → render() + refreshDrawer()   (UI z nowego stanu)
  → save()                       (w renderMain)
```

Kilka zasad, które warto znać przed zmianami:

- **Okna zablokowane.** Okno następnego kroku ustawia `modalLock`. Wtedy kliknięcie obok i Esc nie zamykają okna, a krzyżyk ma akcję `step-skip`.
- **Zmiana etapu i statusu** zawsze idzie przez `setStage` lub `setLeadStatus`. Zapisują poprzedni stan, żeby dało się cofnąć zmianę z okna następnego kroku.
- **Otwieranie rekordów** idzie przez `openRecord(obj, id)`. Lead i szansa otwierają pełny ekran (`state.page = 'record'`), a firma i kontakt panel boczny (`openRec`).
- **Cofanie** działa przez `toast(msg, { label: 'Cofnij', fn })`: funkcja przywraca zapamiętany stan.
- **Pola edytowalne** mają `data-edit="klucz"`. Obsługa `change` rozpoznaje, czy pole jest w panelu bocznym, czy na karcie rekordu.

## Jak dodać funkcję

1. Dane: jeśli potrzebujesz nowego pola, dodaj je do `SCHEMA` z `core: 1`. Jeśli zmieniasz kształt danych, rozszerz `migrateDb()`.
2. Widok: dopisz HTML w odpowiedniej funkcji `render…`. Akcje oznacz `data-act="twoja-akcja"` i dane w `data-*`.
3. Logika: dodaj `case 'twoja-akcja':` w nasłuchiwaczu click. Zmień `db` lub `state`, wywołaj `render()`.
4. Style: dopisz klasy na końcu `<style>`, korzystając ze zmiennych z [design systemu](design-system.md).
5. Teksty: pisz po polsku, bez myślników i półpauz.
6. Testy: dodaj przypadek w `tests/` i uruchom `npm test` ([Testy](testy.md)).

## Typografia w DOM

`MutationObserver` na `document.body` przegląda każdy nowy fragment strony. Skleja twardą spacją jednoliterowe spójniki i przyimki (a, i, o, u, w, z) oraz krótkie słowa (do, na, od, po, za, nie…) z następnym słowem, a liczby z jednostkami. Pomija pola formularzy, `textarea` i `pre`. W CSS akapity mają `text-wrap: pretty`, a nagłówki `text-wrap: balance`, co usuwa wdowy i sieroty.

## Droga do wersji produkcyjnej

Prototyp jest celowo jednoplikowy, żeby szybko testować pomysły z klientami. Wersja komercyjna (faza 1 [roadmapy](roadmapa.md)) wymaga podziału na:

- **frontend** z komponentami (te same ekrany i zasady UX);
- **API i bazę danych** z kontami, zespołami i uprawnieniami;
- **serwis AI** po stronie serwera (klucz nigdy w przeglądarce);
- **workery integracji** (poczta, kalendarz, importy).

Model danych z [model-danych.md](model-danych.md) przenosi się wprost do tabel bazy danych.
