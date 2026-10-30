# Hermes CRM

Prosty, minimalistyczny CRM dla małych i średnich firm — zaprojektowany dla foundera, który sam sprzedaje. To klikalny prototyp w jednym pliku HTML: bez instalacji i bez serwera.

## Uruchomienie

Otwórz `index.html` w przeglądarce (najlepiej na komputerze, w pełnym oknie).

Dane zapisują się automatycznie w tej przeglądarce. Na start zobaczysz dane przykładowe — w **Ustawieniach → Ogólne** możesz je wyczyścić albo przywrócić. Tam też pobierzesz i wczytasz **kopię zapasową** (plik JSON), żeby przenieść dane na inny komputer.

## Jak pracować z Hermesem

1. Każda otwarta szansa ma **następny krok i termin**. Po przesunięciu karty do innego etapu Hermes zapyta, co dalej.
2. Rano otwierasz **Pulpit** — lista „Na dziś” zbiera kroki na dziś, kroki po terminie, szanse bez planu i nowe leady. Odhaczasz, a Hermes pyta o kolejny krok.
3. Po rozmowie, mailu lub spotkaniu dodajesz krótki wpis w **historii** rekordu — data ostatniego kontaktu ustawia się sama.
4. Przegrana szansa wymaga **powodu przegranej** — po kilku tygodniach Analityka pokaże, co najczęściej blokuje sprzedaż.

## Co jest w środku

- **Pulpit** — wartość lejka i postęp celu miesiąca, lista „Na dziś”, największe otwarte szanse.
- **Lejek** — kanban z przeciąganiem, następny krok na każdej karcie, oznaczenie szans stojących 14+ dni w jednym etapie, ostrzeżenie o krokach po terminie.
- **Obiekty** — Firmy, Kontakty, Leady i Szanse: podsumowanie, tabela z wyszukiwarką i kolumną „Ostatni kontakt”, eksport i import CSV.
- **Karta rekordu** — edycja pól, następny krok, historia (notatka, telefon, e-mail, spotkanie, zmiany etapu), powiązane rekordy. Historia firmy zbiera też wpisy jej kontaktów i szans.
- **Dodawanie ręczne** — prosty formularz z ostrzeżeniem o duplikatach.
- **Import CSV** — wgranie lub wklejenie pliku, automatyczne dopasowanie kolumn (separator `,` lub `;`), pomijanie duplikatów, szablon do pobrania.
- **Eksport CSV** — każdy obiekt osobno, z datą ostatniego kontaktu.
- **Konwersja leada** — tworzy firmę, kontakt i szansę, a potem pyta o pierwszy krok.
- **Cofnij** — usunięcie rekordu, przywrócenie demo i wyczyszczenie danych można cofnąć z powiadomienia.
- **Analityka** — wygrane w tym miesiącu względem celu, prognoza zamknięć, pokrycie celu, zdrowie lejka (z czasem w etapie), zespół, jakość źródeł leadów i powody przegranych.
- **Ustawienia** — cel sprzedaży na miesiąc, kopia zapasowa, eksport CSV, dane demo oraz pola obiektów (zmiana nazw, własne pola).

## Skróty klawiszowe

| Skrót | Akcja |
| --- | --- |
| `⌘K` / `Ctrl+K` | Wyszukiwarka |
| `N` | Nowy rekord |
| `⌘↵` / `Ctrl+Enter` | Zapisz wpis w historii |
| `Esc` | Zamknij okno lub kartę |

## Technologia

Jeden plik `index.html`: HTML, CSS i czysty JavaScript, bez zależności. Dane w `localStorage` przeglądarki. Fonty: Space Grotesk i DM Sans (Google Fonts).

## Co dalej

Planowane: edycja tabeli w miejscu i sortowanie, zapisane widoki, edytowalne etapy lejka, szybkie dodawanie z ⌘K, poranny e-mail z planem dnia, integracja z Gmailem, formularz leadów na stronę oraz przejście na aplikację z bazą danych i kontami użytkowników.
