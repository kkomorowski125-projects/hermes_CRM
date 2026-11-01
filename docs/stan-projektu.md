# Stan projektu i jak wrócić do pracy

Ostatnia aktualizacja: 1 listopada 2026, wersja **0.16.2**. Ten plik to punkt startowy dla kolejnej sesji pracy: co jest zrobione, gdzie co leży i od czego zacząć.

## Jak wznowić pracę z Claude

Otwórz nową rozmowę i napisz na przykład: „Kontynuujemy Hermes CRM, repozytorium kkomorowski125-projects/hermes_CRM. Przeczytaj docs/stan-projektu.md i docs/roadmapa.md”. To wystarczy, żeby odtworzyć kontekst bez starego czatu.

## Zasady projektu (stałe)

- Interfejs i dokumentacja po polsku.
- Bez myślników, półpauz i dywizów jako interpunkcji, także w odpowiedziach; bez wdów i sierot.
- Lekki, spokojny design z akcentem iris (design system 2.0: Inter do czytania, Source Serif 4 w tytułach).
- Każdą zmianę commitować i wypychać do `main` na GitHubie.

## Co jest gotowe

| Obszar | Wersja | Najważniejsze |
| --- | --- | --- |
| Fundament | 0.10 | Serwer Fastify (PostgreSQL lub SQLite), konta, 2FA, role, synchronizacja, RODO, kopie, monitoring, CI |
| Maile i logowanie | 0.11 | SMTP, logowanie Google i Microsoft, zadania, poranny plan, NIP z Białej listy, formularz leada, PWA |
| Importy i poczta | 0.12 | Importy z Pipedrive, HubSpot, Livespace, maile przez BCC, seria powitalna, pomoc w aplikacji |
| Wzrost | 0.13 | Produkty i oferty z akceptacją online, automatyzacje, masowe akcje, widoki, duplikaty, webhooki, raport tygodniowy |
| Audyt użyteczności | 0.14 | Na dziś na górze, szybkie akcje, szablony wiadomości, przegląd lejka, strona Zespół z prognozą, dolny pasek na telefonie |
| Design system 2.0 | 0.15 | Nowa typografia i kolory, lżejsze panele i tabele, wyrównane akcje, płaski pasek etapów |
| Umawianie spotkań | 0.16 | Link `/umow/<id>` jak Calendly, rezerwacja zapisana w CRM, .ics, odwołanie, strona Kalendarz, „Umów” na kartach |
| Przycisk Dodaj | 0.16.1 | Uniwersalne menu dodawania z klawiszami, uporządkowany pasek list |
| Instalator macOS | 0.16.2 | `tools/build-installer.sh` buduje zip z aplikacją Hermes CRM, usługą w tle i deinstalatorem |

Testy: 9 plików jsdom w `tests/` i 36 testów serwera w `server/test/`, zielone na SQLite i PostgreSQL.

## Gdzie co leży

- Aplikacja: `index.html` (cały frontend), serwer: `server/src`, instalator: `installer/macos` i `tools/build-installer.sh`.
- Dokumentacja: `docs/` (przewodnik, serwer, wdrożenie, instalacja na Macu, design system, roadmapa z blokerami, testy).
- Historia zmian: `CHANGELOG.md`.
- Artefakty na claude.ai: podgląd aplikacji (test), audyt użyteczności, audyt designu, podsumowanie postępów i minimalistyczna roadmapa.

## Otwarte sprawy

1. **Pierwsza instalacja na prawdziwym Macu.** Instalator przeszedł symulację na Linuksie; trzeba potwierdzić start w tle, ikonę i pobranie Node.js. W razie błędu potrzebny jest plik `~/Library/Application Support/Hermes CRM/hermes.log`.
2. **Z audytu użyteczności zostały 2 punkty:** zadania z godziną i przypomnieniami oraz powód wygranej, role kontaktów i kryteria wyjścia z etapu.
3. **Z audytu designu (kolejne iteracje):** scalenie starszych warstw CSS w jeden zestaw komponentów, tryb ciemny, przypięta kolumna nazwy w tabelach, jedna grubość ikon, szkielety ładowania, fonty serwowane lokalnie (RODO).
4. **Umawianie spotkań** nie sprawdza jeszcze zajętości w Kalendarzu Google; czeka na synchronizację z Google (bloker poniżej).

## Blokery po stronie foundera

Pełna tabela jest w `docs/roadmapa.md`. Najważniejsze: serwer w UE i domena, dostawca SMTP (bez niego nie wychodzą zaproszenia, potwierdzenia spotkań ani poranny plan), klucze Google i Microsoft, weryfikacja aplikacji u Google (Gmail i Kalendarz), operator płatności i faktury, umowa powierzenia i regulamin, klucz GUS.

## Proponowany następny krok

Najpierw potwierdzić instalację na Macu i zebrać uwagi z codziennego używania. Potem, w zależności od decyzji o blokerach: wdrożenie na serwer w UE z domeną i SMTP (otwiera pilotaż), albo dalsze funkcje z otwartych spraw (zadania z godziną, tryb ciemny).

## Uruchomienie dla programisty

```bash
npm test                                   # testy frontendu (jsdom)
cd server && npm install && npm run dev    # serwer z SQLite na http://localhost:3000
npm test && npm run typecheck              # testy i typy serwera
bash tools/build-installer.sh              # instalator macOS w dist/
```
