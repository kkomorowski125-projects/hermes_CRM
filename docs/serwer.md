# Serwer

Serwer w folderze `server/` zamienia prototyp w aplikację dla zespołu. Dane firmy są w bazie danych, każdy loguje się własnym kontem, a role decydują, kto co widzi i zmienia. Interfejs to ten sam `index.html`: gdy serwuje go serwer Hermesa, aplikacja sama przechodzi w tryb serwera.

## Dwa tryby aplikacji

| Tryb | Kiedy | Dane | Konta |
| --- | --- | --- | --- |
| Lokalny | `index.html` otwarty z dysku, z GitHub Pages albo jako artefakt | `localStorage` tej przeglądarki | Brak, profile handlowców są tylko etykietami |
| Serwer | Aplikacja pod adresem serwera Hermesa | Baza PostgreSQL albo SQLite | Logowanie, 2FA, zaproszenia, role |

Przy starcie aplikacja pyta `GET /api/session`. Odpowiedź JSON 200 lub 401 oznacza serwer Hermesa: 401 pokazuje ekran logowania, 200 wczytuje dane firmy. Każda inna odpowiedź (404 na hostingu statycznym, brak `fetch`, plik z dysku) zostawia tryb lokalny bez zmian. W trybie serwera dane nie są zapisywane w `localStorage`.

## Technologia

| Element | Wybór |
| --- | --- |
| Środowisko | Node.js 22.13 lub nowszy, TypeScript (ESM) |
| Framework HTTP | Fastify 5 z `@fastify/cookie` |
| Baza produkcyjna | PostgreSQL 16 (`DATABASE_URL`) |
| Baza lokalna i testowa | Wbudowany `node:sqlite`, gdy `DATABASE_URL` jest puste |
| Testy | `node:test`, SQLite w pamięci albo PostgreSQL z `TEST_DATABASE_URL` |

Migracje są tablicą zapytań SQL w `src/migrations.ts`, zapisywaną w tabeli `schema_migrations`. Schemat używa tylko typów TEXT i INTEGER, dzięki czemu te same migracje działają w obu bazach.

## Uruchomienie lokalne

```bash
cd server
npm install
npm run dev          # http://localhost:3000, dane w server/data/hermes.db
```

Pierwsza osoba zakłada firmę na ekranie logowania („Załóż konto”) i zostaje administratorem. Kolejne osoby dołączają przez zaproszenia z Ustawień → Zespół. Bez skonfigurowanej wysyłki maili linki zaproszeń i resetu hasła trzeba skopiować i przekazać samodzielnie; w trybie deweloperskim serwer zapisuje je też w logu.

| Polecenie | Działanie |
| --- | --- |
| `npm run dev` | Serwer z przeładowaniem po zmianach |
| `npm run build` i `npm start` | Kompilacja do `dist/` i uruchomienie produkcyjne |
| `npm run migrate` | Same migracje bazy |
| `npm run typecheck` | Sprawdzenie typów |
| `npm test` | Testy API i aplikacji w trybie serwera |

Zmienne środowiskowe opisuje [`.env.example`](../.env.example), a wdrożenie [wdrozenie.md](wdrozenie.md).

## Moduły

| Plik | Odpowiedzialność |
| --- | --- |
| `src/config.ts` | Konfiguracja ze zmiennych środowiskowych |
| `src/db.ts` | Wspólny interfejs bazy (`all`, `one`, `run`, `tx`) dla PostgreSQL i SQLite |
| `src/migrations.ts` | Schemat bazy |
| `src/security.ts` | Hasła (scrypt), tokeny, TOTP, limity prób |
| `src/context.ts` | Sesja, role, błędy, dziennik zmian |
| `src/routes-auth.ts` | Rejestracja, logowanie, 2FA, reset hasła, profil, przyjęcie zaproszenia |
| `src/routes-org.ts` | Zespół, role, widoczność, zaproszenia, dziennik zmian |
| `src/routes-data.ts` | Stan, synchronizacja, zmiany, kopia, import, RODO |
| `src/routes-ai.ts` | Hermes AI przez serwer z limitem dziennym |
| `src/app.ts` | Złożenie aplikacji, nagłówki bezpieczeństwa, serwowanie `index.html` |

## Role i widoczność

| Rola | Może |
| --- | --- |
| Administrator | Wszystko: dane, ustawienia firmy (cel, etapy, pola), zespół, zaproszenia, kopia i import, RODO, dziennik zmian |
| Handlowiec | Dodawać i zmieniać rekordy; ustawienia firmy widzi, ale ich nie zmienia |
| Podgląd | Tylko czytać; aplikacja pokazuje baner, a serwer odrzuca zapisy |

Widoczność „Tylko swoje” ukrywa leady i szanse innych opiekunów razem z ich historią. Firmy i kontakty są wspólne. Próba zmiany cudzego rekordu kończy się odrzuceniem z powodem `not_owner`. Firma zawsze ma co najmniej jednego administratora. Usunięcie osoby z zespołu przekazuje jej leady i szanse administratorowi, który ją usuwa.

## Synchronizacja

Rekordy są w jednej tabeli `records` (firma, typ, identyfikator, dane JSON, opiekun, czas zmiany, autor, znacznik usunięcia). Interfejs dalej pracuje na obiekcie `db` w pamięci, a moduł serwera w `index.html` porównuje go z ostatnią wersją z serwera:

1. **Start:** `GET /api/state` zwraca wszystkie widoczne rekordy, ustawienia firmy i kursor czasu.
2. **Zapis:** każde `save()` planuje synchronizację po 450 ms. Wysyłane są tylko rekordy, które się zmieniły, i identyfikatory usuniętych (`POST /api/sync`). Ustawienia firmy wysyła tylko administrator, preferencje osoby (układ Analityki) każdy.
3. **Zmiany innych:** co 20 sekund i po powrocie do karty `GET /api/changes?since=kursor` zwraca rekordy zmienione od ostatniego razu. Rekord, który ktoś właśnie edytuje na tym urządzeniu, nie jest nadpisywany.
4. **Konflikty:** wygrywa ostatni zapis. Odrzucone zmiany (brak uprawnień) wracają do wersji z serwera z komunikatem.

Stan synchronizacji widać pod nazwą firmy w menu: „Zsynchronizowano”, „Zapisywanie zmian”, „Brak połączenia, ponowię” albo „Tylko podgląd”. Przy niezapisanych zmianach przeglądarka ostrzega przed zamknięciem karty.

## API

Wszystkie zapytania zmieniające dane muszą mieć nagłówek `x-hermes: 1` (ochrona przed CSRF), a sesja jest w ciasteczku `hermes_session` (httpOnly, SameSite Lax). Błędy mają postać `{ "error": "kod", "message": "Komunikat po polsku." }`.

| Metoda i ścieżka | Kto | Działanie |
| --- | --- | --- |
| `GET /api/session` | zalogowany | Użytkownik, firma, rola, zespół, firmy użytkownika, stan AI |
| `POST /api/auth/register` | każdy (gdy `SIGNUP=open`) | Nowa firma i konto administratora |
| `POST /api/auth/login` | każdy | Logowanie; `code` przy 2FA; 10 prób na 15 minut |
| `POST /api/auth/logout`, `/switch-org` | zalogowany | Wylogowanie, zmiana firmy |
| `POST /api/auth/reset/request`, `/reset/confirm` | każdy | Link do nowego hasła (2 godziny, jednorazowy) |
| `POST /api/auth/password` | zalogowany | Zmiana hasła, wylogowanie innych urządzeń |
| `POST /api/auth/2fa/setup`, `/enable`, `/disable` | zalogowany | Weryfikacja dwuetapowa TOTP |
| `PATCH /api/me` | zalogowany | Imię i preferencje |
| `GET /api/invites/:token`, `POST …/accept` | każdy z linkiem | Podgląd i przyjęcie zaproszenia |
| `GET /api/org/members`, `PATCH`, `DELETE …/:id` | admin (odczyt: każdy) | Zespół, rola, widoczność, stanowisko, cel |
| `POST /api/org/members/:id/reset` | admin | Link do nowego hasła dla osoby (24 godziny) |
| `GET`, `POST`, `DELETE /api/org/invites` | admin | Zaproszenia ważne 7 dni |
| `PATCH /api/org` | admin | Nazwa firmy |
| `GET /api/audit` | admin | Dziennik zmian |
| `GET /api/state`, `GET /api/changes`, `POST /api/sync` | zalogowany | Synchronizacja (zapis bez roli podglądu) |
| `GET /api/export`, `POST /api/import` | admin | Kopia w formacie prototypu |
| `GET`, `DELETE /api/gdpr/contacts/:id` | admin | Dane osoby i ich trwałe usunięcie |
| `GET /api/ai/status`, `POST /api/ai/messages` | zalogowany | Hermes AI przez serwer |
| `GET /health` | każdy | Stan serwera i bazy |

## RODO

Na karcie kontaktu administrator ma sekcję „Dane osobowe (RODO)”:

- **Pobierz dane osoby** (art. 15 i 20): plik JSON z danymi kontaktu, nazwą firmy, leadami i szansami, w których występuje, oraz wpisami historii.
- **Usuń trwale** (art. 17): treść kontaktu i wpisy jego historii są zastępowane pustym znacznikiem, kontakt znika z leadów i szans, a z innych wpisów usuwane jest powiązanie z osobą.

Obie operacje, tak jak logowanie, eksport, import, zmiany rekordów i uprawnień, trafiają do dziennika zmian (Ustawienia → Zespół → Dziennik zmian).

## Bezpieczeństwo

- Hasła: scrypt z solą, minimum 10 znaków; porównania w stałym czasie.
- Sesje: losowy token w ciasteczku, w bazie tylko jego skrót SHA 256; wygasają po `SESSION_DAYS`.
- 2FA: TOTP zgodne z RFC 6238 (aplikacje typu Google Authenticator), tolerancja jednego okna czasu.
- Ochrona przed CSRF nagłówkiem `x-hermes`, limit prób logowania, nagłówki `X-Content-Type-Options`, `X-Frame-Options` i `Referrer-Policy`.
- Klucz Claude API tylko w zmiennej środowiskowej serwera.

Brakuje jeszcze: wysyłki maili, logowania przez Google i Microsoft, szyfrowania kopii bazy i monitoringu błędów. To kolejne kroki fazy 1 [roadmapy](roadmapa.md).
