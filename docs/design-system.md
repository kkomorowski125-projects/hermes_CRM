# Design system

Hermes jest lekki, spokojny i czytelny: chłodne szarości dostrojone do akcentu iris, jeden kolor wyróżnienia, dużo powietrza i cienkie linie. W CRM większość czasu się czyta, więc typografia jest podporządkowana czytaniu, a kolor pojawia się tylko tam, gdzie coś mówi. Wersja 2.0 systemu (od 0.15) wynika z audytu designu.

## Zasady

1. **Czytelność przed ozdobą.** Jedna rodzina do czytania, etykiety pisane zdaniem, bez rozstrzelonych wersalików.
2. **Jeden głos marki.** Szeryf tylko w tytułach stron, rekordów i okien. Reszta interfejsu jest neutralna.
3. **Trzy poziomy powierzchni.** Tło aplikacji, obszar roboczy, białe panele. Bez wzorów w tle.
4. **Akcje ciche do chwili użycia.** Szybkie akcje w wierszach są bez ramek, ramka pojawia się przy najechaniu.
5. **Spokojny ruch.** Bez podskakiwania przycisków, krótkie przejścia, pełne wyłączenie przy `prefers-reduced-motion`.

## Kolory

Wszystkie kolory są zmiennymi CSS w `:root` (blok „design system 2.0” na końcu arkusza). Nowe style korzystają ze zmiennych, nie z wpisanych wartości.

| Zmienna | Wartość | Użycie |
| --- | --- | --- |
| `--accent` | `#5B61B8` | Przyciski główne, aktywny etap, kropka w tytule strony |
| `--accent-hover` | `#4E54AA` | Najechanie na przycisk główny |
| `--accent-2` | `#8B90DA` | Obramowania przy najechaniu, drugi kolor wykresów |
| `--accent-soft` | `#F3F3FC` | Tła wyróżnionych paneli (następny krok) |
| `--accent-soft-2` | `#E7E8F8` | Znaczniki, zaznaczenia, ukończone etapy |
| `--accent-line` | `#DADCF3` | Obramowania elementów z akcentem |
| `--accent-ink` | `#3D4290` | Tekst na tłach akcentu |
| `--ink` | `#17181F` | Tytuły |
| `--ink2` | `#262833` | Mocny tekst w treści |
| `--text` | `#3D3F4C` | Tekst podstawowy |
| `--mute` | `#696C7B` | Opisy, podpisy, nagłówki kolumn |
| `--faint` | `#8A8D9B` | Etykiety drugiego planu, liczniki |
| `--canvas` | `#F4F4F7` | Tło aplikacji i menu bocznego |
| `--paper` | `#FBFBFD` | Obszar roboczy |
| `--line` | `#E2E3EA` | Obramowania paneli |
| `--line2` | `#ECECF1` | Linie podziału w panelach i tabelach |
| `--line-strong` | `#D4D5DE` | Obramowania pól i przycisków drugorzędnych |
| `--ok` | `#2F7D5B` | Wygrana, sukces |
| `--late` | `#B4432F` | Po terminie, przegrana, usuwanie |
| `--warn` | `#94660F` | Brak kroku, uwaga |

Kontrast: `--text` i `--mute` spełniają WCAG AA na białym i na `--paper`; `--faint` służy tylko do informacji drugorzędnych, które są powtórzone w innym miejscu. Monogramy firmy i profilu w menu mają ciepłe, beżowe tła.

## Typografia

| Rola | Font | Rozmiar i krój |
| --- | --- | --- |
| Tytuł strony | Source Serif 4 | 34 px, 500, światło −1,8% |
| Tytuł rekordu | Source Serif 4 | 30 px (szuflada 24 px), 500 |
| Tytuł okna, pusty stan | Source Serif 4 | 24 px, 500 |
| Nagłówek panelu | Inter | 15,5 px, 600 |
| Liczby w kafelkach | Inter | 24 do 30 px, 600, cyfry tabelaryczne |
| Tekst podstawowy | Inter | 14 px, interlinia 1,55 |
| Etykiety, podpisy, nagłówki kolumn | Inter | 12 do 13 px, 500, pisane zdaniem |

Inter ma wysoką wysokość x i pełne polskie znaki, dlatego dobrze czyta się w gęstych tabelach. Włączone są warianty `cv05` i `cv08`, które odróżniają małe „l” i wielkie „I”. Cyfry tabelaryczne obowiązują tylko w tabelach, kafelkach i kwotach; w zdaniach cyfry są proporcjonalne. Kwoty formatujemy z odstępem tysięcy i „zł” (`54 000 zł`), a duże w kafelkach jako „54 tys.”.

Długie teksty używają `text-wrap-style: pretty`, a nagłówki `balance`. Nie używamy skrótu `text-wrap`, bo resetuje on `white-space: nowrap` i łamie komórki tabel.

## Komponenty

| Komponent | Klasa | Uwagi |
| --- | --- | --- |
| Przycisk główny | `.primary-button` | Jeden na widok; wersja `.sm` w paskach narzędzi |
| Przycisk dodawania z mikrofonem | `.split-add` | Przycisk główny + `.split-mic` |
| Przycisk drugorzędny | `.ghost-button` | Białe tło, obramowanie `--line-strong`, wysokość 38 px |
| Przycisk tekstowy | `.text-button` | Akcje w nagłówkach paneli |
| Panel | `.panel` + `.panel-head` | Białe tło, promień 16 px, nagłówek 60 px |
| Przełącznik | `.seg` | Okresy, filtry, widoki |
| Chip | `.chip-btn` | Szybkie daty, filtry osi czasu, podpowiedzi |
| Tag | `.tag` | Etap, status, źródło, z kolorową kropką |
| Kafelek wskaźnika | `.metric`, `.kpi` | Wyróżniony ma tło z gradientem akcentu |
| Karta kanbanu | `.deal-card` | Następny krok `.next` w kolorze pilności |
| Szybkie akcje | `.qa` + `.qa-b` | Bez ramki, ramka przy najechaniu na wiersz; ostatnia akcja wiersza zawsze w tym samym miejscu (`.qa-done`, `.qa-plan`) |
| Okno | `.modal` + `.mhead` + `.mfoot` | Szerokie `.wide`, wyszukiwarka `.cmd`, głos `.voice` |
| Powiadomienie | `.toast` | Opcjonalny przycisk akcji, np. „Cofnij” |

**Stany pilności:** dziś na zielonym tle, po terminie na różowym z czerwonym tekstem, brak kroku na żółtym.

## Układ

- Menu boczne 252 px na tle `--canvas`, obszar roboczy jako jasna karta z marginesem 8 px, bez wzoru w tle.
- Treść do 1400 px szerokości, odstęp od góry 32 px, między panelami 12 px.
- Odstępy w krokach 4 i 8 px.
- Promienie: pola i małe przyciski 8 do 10 px, karty kanbanu 12 px, panele i okna 16 px.
- Wiersze tabel 56 px, wiersze listy „Na dziś” 62 px.
- Cienie: `--sh-1` dla paneli, `--sh-2` przy najechaniu, `--sh-pop` dla okien i powiadomień.
- Analityka używa siatki 12 kolumn (`.mgrid`), która przechodzi na 2 kolumny poniżej 1280 px i na 1 poniżej 1000 px.
- Poniżej 820 px menu boczne staje się poziomym paskiem, poniżej 600 px nawigację przejmuje dolny pasek.

## Zasady pisania

- **Po polsku, krótko, konkretnie.** Liczby z jednostkami, daty względne („jutro”, „3 dni temu”).
- **Bez myślników, półpauz i dywizów jako interpunkcji.** Zamiast nich przecinek, dwukropek albo kropka. Piszemy „email” i „follow up”. Test `zespol-lejek-wyszukiwarka.test.js` sprawdza, że w interfejsie nie ma myślników.
- **Bez wdów i sierot.** Jednoliterowe słowa i krótkie przyimki są automatycznie sklejane twardą spacją z następnym słowem ([architektura](architektura.md#typografia-w-dom)).
- **Puste wartości:** w tabelach środkowa kropka `·`, w zdaniach słowo „brak”.
- **Przyciski mówią, co się stanie:** „Zamknij zadanie i zapisz krok”, a nie „OK”.
- **Komunikaty o błędach mówią, co zrobić:** „Podaj nazwę szansy.”

## Dostępność

- Przyciski z samą ikoną mają `aria-label` i `title`.
- Dynamiczne obszary (wyniki, historia AI, transkrypcja) mają `aria-live`.
- Fokus klawiatury jest widoczny (`:focus-visible` w kolorze akcentu).
- Kolor nigdy nie jest jedynym nośnikiem informacji: pilność ma też tekst („po terminie”).
