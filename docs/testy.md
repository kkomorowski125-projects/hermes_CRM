# Testy

Testy ładują `index.html` w [jsdom](https://github.com/jsdom/jsdom), klikają przez interfejs tak jak użytkownik i sprawdzają dane oraz to, co widać na ekranie. Uruchamiają się lokalnie i w GitHub Actions przy każdym pushu na `main` i każdym pull requeście.

## Uruchomienie

```bash
npm install        # raz, instaluje jsdom
npm run check      # sprawdza składnię skryptu w index.html
npm test           # uruchamia wszystkie testy
```

Wynik pokazuje każdy przypadek (✓ albo ✗) i podsumowanie pliku. Polecenie kończy się błędem, gdy którykolwiek przypadek nie przejdzie albo w aplikacji wystąpi błąd JavaScript.

## Zestawy

| Plik | Co sprawdza |
| --- | --- |
| `tests/rekordy.test.js` | Puste listy, dane demo, filtry i sortowanie list, karta leada i szansy, powiązania kontaktów i firmy, następny krok z pominięciem, konwersja i odrzucenie leada, wygrana i ponowne otwarcie, aktywności z wynikiem rozmowy, usuwanie z cofaniem, szybkie dodawanie, import CSV z osobą kontaktową, Hermes AI, migracja danych z wersji 2 |
| `tests/zespol-lejek-wyszukiwarka.test.js` | Profile handlowców, filtry opiekuna, edycja etapów lejka, lejek leadów z przeciąganiem, moduły analityki, wyszukiwarka z klawiaturą i zakresami, twarde spacje i brak myślników |
| `tests/analityka.test.js` | Okresy od dnia do roku, nawigacja po okresach, cel kwartału, filtr opiekuna |
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
- Połączenia z Claude API.
- Wyglądu w różnych przeglądarkach; to sprawdzamy ręcznie i zrzutami ekranu.
