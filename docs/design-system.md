# Design system

Hermes jest minimalistyczny i spokojny: jasne, chłodne szarości, jeden akcent w kolorze iris i ciepłe monogramy. Kolor ma znaczenie, więc pojawia się tylko tam, gdzie coś mówi.

## Kolory

Wszystkie kolory są zmiennymi CSS w `:root`. Nowe style korzystają ze zmiennych, nie z wpisanych wartości.

| Zmienna | Wartość | Użycie |
| --- | --- | --- |
| `--accent` | `#5B61B8` | Przyciski główne, aktywny etap, wyróżnienia |
| `--accent-hover` | `#4F55A8` | Najechanie na przycisk główny |
| `--accent-2` | `#8B90DA` | Obramowania przy najechaniu, drugi kolor wykresów |
| `--accent-soft` | `#F1F2FB` | Tła wyróżnionych paneli (następny krok, edycja układu) |
| `--accent-soft-2` | `#E5E7F7` | Znaczniki, zaznaczenia, ukończone etapy |
| `--accent-line` | `#D9DCF2` | Obramowania elementów z akcentem |
| `--accent-ink` | `#3D4290` | Tekst na tłach akcentu |
| `--ink` | `#15161A` | Tytuły |
| `--ink2` | `#282930` | Mocny tekst w treści |
| `--text` | `#41434D` | Tekst podstawowy |
| `--mute` | `#656874` | Opisy, podpisy |
| `--faint` | `#686B77` | Etykiety pól, daty |
| `--line` | `#D5D6DD` | Obramowania paneli i pól |
| `--line2` | `#E5E6EB` | Linie podziału |
| `--paper` | `#F7F8F5` | Tło obszaru roboczego |
| `--side` | `#EFF0F3` | Tło menu bocznego |
| `--ok` | `#3F8A66` | Wygrana, sukces, zgodność z ICP |
| `--late` | `#B9442F` | Po terminie, przegrana, usuwanie |
| `--amber` | `#D5A445` | Brak kroku, uwaga |

Monogramy firmy i profilu w menu mają ciepłe, beżowe tła z delikatnym gradientem. Etapy i statusy mają kropki w stonowanych kolorach z mapy `TONE` w skrypcie.

## Typografia

| Rola | Font | Rozmiar |
| --- | --- | --- |
| Nagłówek strony | Space Grotesk 600 | 38 px |
| Tytuł rekordu | Space Grotesk 600 | 28 px |
| Nagłówek panelu | Space Grotesk 600 | 15 do 17 px |
| Liczby w kafelkach | Space Grotesk 600 | 28 do 36 px |
| Tekst podstawowy | DM Sans 400 i 500 | 14 px |
| Etykiety, podpisy | DM Sans | 12 do 13 px |

Liczby używają cyfr tabelarycznych (`font-variant-numeric: tabular-nums`), żeby kolumny kwot się wyrównywały. Kwoty formatujemy z odstępem tysięcy i „zł” (`54 000 zł`), a duże w kafelkach jako „54 tys.”.

## Komponenty

| Komponent | Klasa | Uwagi |
| --- | --- | --- |
| Przycisk główny | `.primary-button` | Jeden na widok; wersja `.sm` w paskach narzędzi |
| Przycisk dodawania z mikrofonem | `.split-add` | Przycisk główny + `.split-mic` |
| Przycisk drugorzędny | `.ghost-button` | Białe tło, obramowanie |
| Przycisk tekstowy | `.text-button` | Akcje w nagłówkach paneli |
| Panel | `.panel` + `.panel-head` | Białe tło, promień 10 px, numer sekcji `.idx` |
| Przełącznik | `.seg` | Okresy, filtry, widoki |
| Chip | `.chip-btn` | Szybkie daty, filtry osi czasu, podpowiedzi |
| Tag | `.tag` | Etap, status, źródło, z kolorową kropką |
| Kafelek wskaźnika | `.metric`, `.kpi` | Wyróżniony ma tło z gradientem akcentu |
| Karta kanbanu | `.deal-card` | Następny krok `.next` w kolorze pilności |
| Okno | `.modal` + `.mhead` + `.mfoot` | Szerokie `.wide`, wyszukiwarka `.cmd`, głos `.voice` |
| Powiadomienie | `.toast` | Opcjonalny przycisk akcji, np. „Cofnij” |

**Stany pilności:** dziś na zielonym tle, po terminie na różowym z czerwonym tekstem, brak kroku na żółtym.

## Układ

- Menu boczne 252 px, obszar roboczy z siatką kropek co 28 px.
- Odstępy w krokach 4 i 8 px; między panelami 14 px.
- Promienie: przyciski 8 px, panele 10 px, okna 12 px.
- Analityka używa siatki 12 kolumn (`.mgrid`), która przechodzi na 2 kolumny poniżej 1280 px i na 1 poniżej 1000 px.
- Poniżej 820 px menu boczne staje się poziomym paskiem.

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
