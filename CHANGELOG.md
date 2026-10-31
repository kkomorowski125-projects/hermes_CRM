# Historia zmian

Format według [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/). Wersje przed 1.0 to etapy prototypu.

## [0.16.0] · 31 października 2026

### Dodane
- Umawianie spotkań przez link (jak Calendly): strona `/umow/<id>` z wolnymi terminami w czasie polskim, rezerwacja z imieniem, emailem, firmą i tematem.
- Rezerwacja sama trafia do CRM: kontakt i firma bez duplikatów, spotkanie przy otwartej szansie lub leadzie (albo nowy lead ze źródłem „Kalendarz”), następny krok na dzień spotkania.
- Potwierdzenia mailem z zaproszeniem `.ics` dla klienta i handlowca, odwołanie z linku w mailu, zdarzenia `meeting.booked` i `meeting.cancelled` dla webhooków.
- Strona Kalendarz: nadchodzące spotkania, spotkania do podsumowania, link do umawiania, najbliższe wolne terminy, ustawienia dostępności.
- „Umów” na kartach rekordów: wybór terminu z dostępności i zaproszenie mailem.
- Spotkania dziś nad listą „Na dziś”, „Odbyło się” z pytaniem o kolejny krok, szablon „Wybór terminu” z polem `{link_kalendarza}`.

## [0.15.1] · 31 października 2026

### Zmienione
- Lista „Na dziś”: każdy wiersz ma akcję w tym samym miejscu, „Zrobione” albo „Ustal krok” w kolorze uwagi, więc kolumny przycisków się wyrównują.
- Karty lejka: następny krok w dwóch liniach z terminem pod spodem zamiast uciętego tekstu.
- Pasek etapów na karcie szansy jako płaskie segmenty zamiast strzałek.
- Górny pasek przyklejony przy przewijaniu, z rozmyciem tła.

## [0.15.0] · 31 października 2026

Design system 2.0 po audycie designu: lżej, spokojniej, wygodniej do czytania.

### Zmienione
- Typografia: Inter do czytania (wysoka wysokość x, pełne polskie znaki, warianty odróżniające „l” i „I”), Source Serif 4 w tytułach stron, rekordów i okien.
- Etykiety, menu i nagłówki kolumn pisane zdaniem zamiast rozstrzelonych wersalików.
- Kolorystyka: chłodne szarości dostrojone do akcentu iris zamiast oliwkowych, trzy poziomy powierzchni, cieńsze linie, obszar roboczy bez wzoru w tle.
- Układ: krótszy dystans od nagłówka do treści, nagłówki paneli bez numerów, gęstsze tabele (56 px), mniejsze kafelki wskaźników, przyciski list po prawej stronie.
- Szybkie akcje na liście „Na dziś” bez ramek do chwili najechania, na telefonie zostają telefon i „Zrobione”.
- Przyciski 38 px bez podskakiwania, panele i okna z promieniem 16 px, wyłączanie animacji przy `prefers-reduced-motion`.

### Naprawione
- Nazwy w tabelach łamały się na kilka linii, bo skrót `text-wrap` resetował `white-space: nowrap`.
- Przycisk Hermes AI na telefonie znowu pokazuje samą ikonę, menu na wąskim ekranie zajmuje mniej miejsca.

## [0.14.0] · 31 października 2026

Wdrożenie audytu użyteczności dla foundera, handlowca i managera sprzedaży.

### Dodane
- Szybkie akcje na liście „Na dziś”: telefon, wiadomość z szablonu, „Zrobione”.
- Szablony wiadomości z imieniem, formą „Pan” lub „Pani”, firmą i podpisem; wysyłka przez własną pocztę z wpisem w historii; edycja w Ustawieniach.
- „Jak poszło?” przy zamykaniu kroku: rodzaj kontaktu, wynik i notatka w jednym oknie; „To zamyka krok” w historii.
- Przegląd lejka: szanse do decyzji jedna po drugiej, przypomnienie raz w tygodniu.
- Strona Zespół: prognoza miesiąca z kategoriami Lejek, Możliwe, Pewne, lejek na osobę, aktywność tygodniowa wobec celu.
- Dolny pasek nawigacji z przyciskiem „+” na telefonie.

### Zmienione
- Pulpit zaczyna się od listy „Na dziś”, wskaźniki są niżej.
- Ustawienia mają pięć zakładek; automatyzacje, produkty i pola są w zakładce Zaawansowane.
- Kwoty w trybie edycji mają separatory tysięcy, zamknięte kolumny lejka są węższe, pusta sekcja produktów na karcie jest zwinięta.
- Import przeniesiony z górnego paska na listy obiektów.

## [0.13.0] · 31 października 2026

### Dodane
- Produkty i oferty: katalog z ceną netto i VAT, pozycje w szansie z rabatem, wartość szansy z pozycji, oferta do druku i PDF, link dla klienta z akceptacją online i powiadomieniem.
- Automatyzacje: zadania po wejściu w etap, wygranej i przegranej, przydział nowych leadów wybranej osobie albo po kolei, gotowe szablony reguł.
- Masowe akcje na listach: zmiana opiekuna, etapu i statusu, usuwanie, wszystko z cofaniem.
- Zapisane widoki list dla każdej osoby i scalanie duplikatów firm i kontaktów.
- Webhooki wychodzące dla Zapiera i Make z podpisem HMAC.
- Raport zespołu: eksport CSV z Analityki i cotygodniowe podsumowanie mailem dla administratorów.

## [0.12.0] · 31 października 2026

### Dodane
- Import z Pipedrive, HubSpot i Livespace: rozpoznanie eksportu, automatyczne dopasowanie kolumn, mapowanie etapów, statusy wygranej i przegranej, imię i nazwisko z dwóch kolumn.
- Maile w historii przez adres BCC firmy: odbiór z Postmark lub z prostego JSON, nowe kontakty i firmy po domenie, bez duplikatów.
- Seria powitalna: mail po rejestracji, w dniu 2 i w dniu 5, zależna od stanu konta.
- Pomoc w aplikacji: najczęstsze pytania z wyszukiwaniem, skróty klawiszowe, klawisz „?”.

### Zmienione
- Po imporcie otwarte leady i szanse dostają następny krok i wpis w historii.

## [0.11.0] · 31 października 2026

### Dodane
- Wysyłka maili przez SMTP: zaproszenia, link do nowego hasła, poranny plan dnia.
- Logowanie Google i Microsoft (OpenID Connect z PKCE), łączenie kont w Ustawieniach, 2FA także po logowaniu przez dostawcę.
- Zadania: wiele na leada i szansę, z terminem i osobą; w liście „Na dziś” i w porannym mailu.
- Dane firmy po NIP z Białej listy MF w formularzu nowej firmy.
- Formularz leada na stronę i webhook dla Zapiera i Make, z deduplikacją firm i kontaktów.
- Aplikacja do zainstalowania na telefonie i komputerze (PWA) i układ dla ekranów telefonu.
- Monitoring: numer zgłoszenia przy błędach, alerty na webhook, błędy z przeglądarki w logu.
- Szyfrowane kopie bazy co noc i HTTPS przez Caddy w Docker Compose.

## [0.10.0] · 30 października 2026

### Dodane
- Serwer w `server/` (Node.js 22, Fastify, TypeScript) z bazą PostgreSQL albo SQLite i migracjami.
- Konta: rejestracja firmy, logowanie, weryfikacja dwuetapowa TOTP, reset hasła, zmiana hasła, kilka firm na jednym koncie.
- Zespół: zaproszenia z linkiem, role administrator, handlowiec i podgląd, widoczność „tylko swoje”, cele i stanowiska, dziennik zmian.
- Tryb serwera w `index.html`: ekran logowania, synchronizacja zmian z serwerem i od innych osób, stan synchronizacji w menu, Ustawienia konta i zespołu.
- Hermes AI przez serwer: klucz Claude API tylko na serwerze, dzienny limit zapytań na firmę.
- RODO: pobranie i trwałe usunięcie danych osoby na karcie kontaktu.
- Dockerfile, `docker-compose.yml` z PostgreSQL, `.env.example`.
- Testy API i aplikacji w trybie serwera, CI na SQLite i PostgreSQL, budowanie obrazu Docker.

### Zmienione
- Identyfikatory rekordów zawierają losową część, żeby nie powtarzały się między osobami.

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
