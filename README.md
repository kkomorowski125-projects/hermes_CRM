# Hermes CRM

[![Testy](https://github.com/kkomorowski125-projects/hermes_CRM/actions/workflows/tests.yml/badge.svg)](https://github.com/kkomorowski125-projects/hermes_CRM/actions/workflows/tests.yml)

Prosty, AI-native CRM dla małych i średnich firm, zaprojektowany dla foundera, który sam sprzedaje. Hermes pilnuje, żeby każdy klient miał następny krok, a dane możesz dodawać głosem.

![Pulpit Hermesa z listą „Na dziś”](docs/img/pulpit.png)

> **Status:** klikalny prototyp (wersja 0.9). Całość działa w jednym pliku `index.html`, a dane trzyma w przeglądarce. Plan przejścia na komercyjny produkt jest w [roadmapie](docs/roadmapa.md).

## Szybki start

1. Pobierz repozytorium albo sam plik [`index.html`](index.html).
2. Otwórz `index.html` w Chrome, Edge albo Safari, najlepiej na komputerze.
3. Na Pulpicie kliknij **„Wczytaj dane demo”**, żeby zobaczyć Hermesa z przykładowym lejkiem, albo przejdź listę **„Zacznij tutaj”** z własnymi danymi.

Nie trzeba niczego instalować. Do pracy nad kodem i testów potrzebujesz Node.js 18 lub nowszego ([CONTRIBUTING.md](CONTRIBUTING.md)).

## Co potrafi

| Obszar | Najważniejsze funkcje |
| --- | --- |
| Leady i szanse | Osobne obiekty: lead to potencjalny klient, szansa to klient w procesie sprzedaży. Konwersja z checklistą ICP i zainteresowania, odrzucenie z powodem. |
| Następny krok | Każdy otwarty lead i szansa ma krok z terminem. Zamknięcie zadania wymusza kolejne, krok można świadomie pominąć krzyżykiem. |
| Karty rekordów | Pełny ekran jak w HubSpocie czy Pipedrive: pasek etapów, kluczowe liczby, firma i wiele kontaktów, aktywności z wynikiem rozmowy, oś czasu z filtrami. |
| Lejek | Kanban szans z edytowalnymi etapami i prostszy kanban leadów, przeciąganie, filtr opiekuna. |
| Hermes Voice | Dodawanie firmy, kontaktu, leada i szansy głosem, także wszystko naraz, z podglądem przed zapisem. |
| Hermes AI | Plan dnia, zagrożone szanse, kolejność leadów, podsumowania i szkice maili. Działa lokalnie albo z kluczem Claude API. |
| Analityka | Okresy od dnia do roku, porównanie z poprzednim okresem, prognoza ważona, układ modułów do przeciągania. |
| Wyszukiwarka | Grupowane wyniki z podświetleniem, zakresy, klawiatura, szukanie po telefonach, emailach i historii. |
| Zespół | Profile handlowców z celami, opiekunowie rekordów, filtry w lejku, listach i analityce. |
| Dane | Import i eksport CSV z dopasowaniem kolumn, kopia zapasowa JSON, dane demo, cofanie operacji. |

Szczegóły i zrzuty ekranu są w [przewodniku użytkownika](docs/przewodnik.md).

## Dokumentacja

| Dokument | Dla kogo |
| --- | --- |
| [Przewodnik użytkownika](docs/przewodnik.md) | Jak pracować w Hermesie, ekran po ekranie |
| [Architektura](docs/architektura.md) | Jak zbudowana jest aplikacja i jak dodać funkcję |
| [Model danych](docs/model-danych.md) | Obiekty, pola, relacje, zapis i migracje |
| [Import i eksport](docs/import-eksport.md) | Formaty CSV, kolumny, kopia zapasowa |
| [Hermes AI](docs/hermes-ai.md) | Tryb lokalny, Claude API, bezpieczeństwo klucza |
| [Hermes Voice](docs/hermes-voice.md) | Rozpoznawanie mowy i reguły parsera |
| [Design system](docs/design-system.md) | Kolory, typografia, komponenty, zasady pisania |
| [Testy](docs/testy.md) | Jak uruchomić i pisać testy |
| [Roadmapa](docs/roadmapa.md) | Fazy, priorytety i metryki do wersji komercyjnej |
| [Historia zmian](CHANGELOG.md) | Co zmieniło się w kolejnych wersjach |

## Skróty klawiszowe

| Skrót | Akcja |
| --- | --- |
| `⌘K` / `Ctrl+K` / `/` | Wyszukiwarka |
| `⌘J` / `Ctrl+J` | Ask Hermes AI |
| `V` | Dodaj głosem |
| `N` | Nowy rekord (lead na Pulpicie, szansa w Lejku szans) |
| `⌘↵` / `Ctrl+Enter` | Zapisz wpis w historii |
| `Esc` | Zamknij okno lub panel; na karcie rekordu wróć do listy |

## Struktura repozytorium

```
index.html          cała aplikacja: HTML, CSS i JavaScript
docs/               dokumentacja i zrzuty ekranu (docs/img)
tests/              testy w jsdom, uruchamiane przez npm test
tools/              sprawdzenie składni i skrypt zrzutów ekranu
.github/            CI (GitHub Actions) i szablony zgłoszeń
```

## Technologia

Jeden plik HTML z czystym JavaScriptem, bez frameworka i bez zależności w przeglądarce. Dane w `localStorage`, fonty Space Grotesk i DM Sans z Google Fonts. Rozpoznawanie mowy przez Web Speech API przeglądarki. Testy w Node.js z jsdom, uruchamiane w GitHub Actions przy każdym pushu.

## Ograniczenia prototypu

- Dane są tylko w tej przeglądarce. Przenosisz je kopią zapasową JSON.
- Brak kont, serwera i synchronizacji między osobami.
- Klucz Claude API jest trzymany w przeglądarce, co jest dopuszczalne tylko w prototypie.
- Rozpoznawanie mowy zależy od przeglądarki; Firefox go nie obsługuje.

## Licencja

Wszelkie prawa zastrzeżone. Kod jest publicznie widoczny w celach poglądowych; użycie komercyjne wymaga zgody autora.
