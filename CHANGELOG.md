# Historia zmian

Format według [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/). Wersje przed 1.0 to etapy prototypu.

## [0.9.0] · 30 października 2026

### Dodane
- Pełna dokumentacja w `docs/`, zrzuty ekranu, testy w `tests/` uruchamiane przez `npm test`, CI w GitHub Actions, szablony zgłoszeń i PR.
- Hermes Voice: dodawanie firmy, kontaktu, leada i szansy głosem, także wszystko naraz, z podglądem przed zapisem i dopracowaniem pól przez Claude.
- Dyktowanie w notatkach, formularzach dodawania i polu Hermes AI.

### Zmienione
- Mikrofon jest częścią przycisku dodawania w górnym pasku i na listach zamiast osobnego przycisku.

## [0.8.0] · 30 października 2026

### Dodane
- Profile handlowców z rolą i celem, opiekun w formularzach, filtry opiekuna w lejku, listach i analityce.
- Edytowalne etapy lejka: nazwa, prawdopodobieństwo, podpowiedź kroku, dodawanie, usuwanie z przeniesieniem szans, kolejność.
- Prosty lejek leadów z przeciąganiem i konwersją z kanbana.
- Analityka na siatce modułów: przeciąganie, szerokość, dodawanie i usuwanie, trzy nowe moduły.
- Wyszukiwarka z grupowanymi wynikami, podświetleniem, zakresami, klawiaturą i szukaniem w historii.

### Zmienione
- Teksty bez myślników i półpauz; automatyczne twarde spacje i łamanie bez wdów i sierot.

## [0.7.0] · 30 października 2026

### Dodane
- Okresy w analityce: dzień, tydzień, miesiąc, kwartał, rok, z nawigacją i porównaniem z poprzednim okresem.
- Pasek aktywności handlowej i wykres „Wygrane i prognoza”.

## [0.6.0] · 30 października 2026

### Dodane
- Osobne obiekty lead i szansa, konwersja z checklistą ICP, odrzucenie z powodem.
- Pełnoekranowe karty leada i szansy z paskiem etapów, powiązaniami wielu kontaktów i osią czasu.
- Pominięcie następnego kroku krzyżykiem; mechanizm kroków także dla leadów.
- Filtry i sortowanie list, prognoza ważona, czas reakcji na nowe leady, ostatnio otwierane w wyszukiwarce.
- Migracja danych z wersji 2.

## [0.5.0] · 30 października 2026

### Dodane
- Pusta wersja startowa z listą „Zacznij tutaj” i danymi demo na żądanie.

### Zmienione
- Spokojna paleta iris zamiast limonki, ciepłe, wyśrodkowane monogramy.

## [0.4.0] · 30 października 2026

### Dodane
- Wymuszanie następnego kroku po zamknięciu zadania i zmianie etapu.
- Ask Hermes AI: tryb lokalny i połączenie z Claude API.

## [0.3.0] · 30 października 2026

### Dodane
- Następne kroki, historia kontaktów, zapis danych w przeglądarce, kopia zapasowa, cofanie operacji.

## [0.1.0] · 30 października 2026

### Dodane
- Pierwszy klikalny prototyp: firmy, kontakty, leady, szanse, lejek, import i eksport CSV, analityka.
