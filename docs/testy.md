# Testy

Testy ładują `index.html` w [jsdom](https://github.com/jsdom/jsdom), klikają przez interfejs tak jak użytkownik i sprawdzają dane oraz to, co widać na ekranie. Uruchamiają się lokalnie i w GitHub Actions przy każdym pushu na `main` i każdym pull requeście.

## Uruchomienie

```bash
npm install        # raz, instaluje jsdom
npm run check      # sprawdza składnię skryptu w index.html
npm test           # uruchamia wszystkie testy
```

Testy serwera są w `server/test` i uruchamiają się na SQLite w pamięci albo na PostgreSQL:

```bash
cd server && npm install
npm test                                                     # SQLite
TEST_DATABASE_URL=postgres://user@localhost/hermes_test npm test   # PostgreSQL, schemat jest czyszczony
```

Wynik pokazuje każdy przypadek (✓ albo ✗) i podsumowanie pliku. Polecenie kończy się błędem, gdy którykolwiek przypadek nie przejdzie albo w aplikacji wystąpi błąd JavaScript.

## Zestawy

| Plik | Co sprawdza |
| --- | --- |
| `tests/rekordy.test.js` | Puste listy, dane demo, filtry i sortowanie list, karta leada i szansy, powiązania kontaktów i firmy, następny krok z pominięciem, konwersja i odrzucenie leada, wygrana i ponowne otwarcie, aktywności z wynikiem rozmowy, usuwanie z cofaniem, szybkie dodawanie, import CSV z osobą kontaktową, Hermes AI, migracja danych z wersji 2 |
| `tests/zespol-lejek-wyszukiwarka.test.js` | Profile handlowców, filtry opiekuna, edycja etapów lejka, lejek leadów z przeciąganiem, moduły analityki, wyszukiwarka z klawiaturą i zakresami, twarde spacje i brak myślników |
| `tests/analityka.test.js` | Okresy od dnia do roku, nawigacja po okresach, cel kwartału, filtr opiekuna |
| `server/test/api.test.ts` | Rejestracja, CSRF, synchronizacja i zmiany, zaproszenia, role i widoczność, podgląd, ostatni administrator, 2FA i limit logowania, reset hasła, RODO, kopia i import, AI z limitem |
| `server/test/auth-extra.test.ts` | Maile z zaproszeniem i resetem, logowanie Google i Microsoft: PKCE, nowa firma, łączenie kont, 2FA po logowaniu, zaproszenie, zły wydawca i stan |
| `server/test/growth.test.ts` | NIP z Białej listy (podstawiona odpowiedź), formularz leada z deduplikacją i pułapką na boty, zadania, poranny plan |
| `server/test/inbound.test.ts` | Maile przez BCC (Postmark i JSON), nowy kontakt i firma po domenie, brak duplikatów, zły sekret, seria powitalna |
| `server/test/phase3.test.ts` | Webhooki z podpisem HMAC, automatyzacje dla leadów z formularza, oferty z akceptacją i powiadomieniem, raport tygodniowy |
| `server/test/frontend.test.ts` | `index.html` w jsdom połączony z prawdziwym API: ekran logowania, wczytanie i zapis danych, zmiany innych osób, zaproszenie z Ustawień, baner podglądu |
| `tests/zadania.test.js` | Zadania na karcie szansy, lista „Na dziś”, cofanie, zapis, pole NIP w formularzu firmy, pomoc w aplikacji |
| `tests/importy.test.js` | Eksporty Pipedrive i HubSpot: rozpoznanie, kolumny, mapowanie etapów, statusy, daty, imię i nazwisko z dwóch kolumn, duplikaty |
| `tests/faza3.test.js` | Automatyzacje (szablony, etap, wygrana, przydział leadów), masowe akcje z cofaniem, zapisane widoki, scalanie duplikatów, katalog produktów, pozycje i wartość szansy, podgląd oferty, raport zespołu |
| `tests/audyt.test.js` | Zmiany z audytu użyteczności: „Na dziś” na górze pulpitu, szybkie akcje, wynik kontaktu przy „Zrobione”, „To zamyka krok”, szablony wiadomości, przegląd lejka, kategoria prognozy, strona Zespół, cel aktywności, dolny pasek na telefonie, porządek Ustawień |
| `tests/glos.test.js` | Parser Hermes Voice na przykładowych zdaniach, zapis i powiązania, wykrywanie istniejących rekordów, wejścia głosowe w formularzach i notatkach |

## Pisanie testu

```js
const { boot, kit, ok, done } = require('./helpers');
const w = boot();                      // świeża aplikacja w jsdom
const { d, errs, click, E } = kit(w);  // narzędzia do klikania i odczytu

click('[data-act="demo-quick"]');                       // klik jak użytkownik
ok(E('db.deal.length') === 14, 'dane demo wczytane');   // asercja z opisem
done(errs);                                             // podsumowanie i kod wyjścia
```

| Narzędzie | Działanie |
| --- | --- |
| `click(selektor)` | Klika element |
| `submit(selektor)` | Wysyła formularz |
| `chg(selektor, wartość)` | Ustawia pole i wywołuje `change` |
| `inp(selektor, wartość)` | Ustawia pole i wywołuje `input` |
| `key(element, klawisz, opcje)` | Wciska klawisz |
| `txt(selektor)` | Tekst elementu ze zwiniętymi odstępami |
| `E('wyrażenie')` | Odczyt stanu aplikacji, np. `E('state.page')` |
| `boot(pre)` | Nowa instancja; `pre(window)` pozwala np. podłożyć dane w `localStorage` |

Nazwy przypadków piszemy krótko, tak żeby z wyniku było jasne, co nie działa.

## Zrzuty ekranu

`tools/screenshots.py` odtwarza zrzuty z `docs/img` w Playwright (Chromium, 1440 × 900):

```bash
pip install playwright && playwright install chromium
python3 tools/screenshots.py
```

Po zmianach wyglądu odśwież zrzuty, żeby dokumentacja pokazywała aktualny interfejs.

## Czego testy nie obejmują

- Prawdziwego rozpoznawania mowy (jsdom nie ma mikrofonu); parser i zapis są testowane na tekście.
- Połączenia z prawdziwym Claude API (w testach serwera odpowiedź jest podstawiona).
- Wyglądu w różnych przeglądarkach; to sprawdzamy ręcznie i zrzutami ekranu.
