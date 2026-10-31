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

Pierwsza osoba zakłada firmę na ekranie logowania („Załóż konto”) i zostaje administratorem. Kolejne osoby dołączają przez zaproszenia z Ustawień → Zespół. Z ustawionym `SMTP_URL` zaproszenia i linki do zmiany hasła wychodzą mailem. Bez niego link trzeba skopiować i przekazać samodzielnie; w trybie deweloperskim serwer zapisuje go też w logu.

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
| `src/routes-oauth.ts` | Logowanie Google i Microsoft (OpenID Connect z PKCE), połączone konta |
| `src/routes-growth.ts` | Dane firmy po NIP, formularz leada na stronę, poranny plan dnia mailem |
| `src/mail.ts` | Wysyłka maili przez SMTP i szablon wiadomości |
| `src/routes-inbound.ts` | Maile w historii przez adres BCC firmy |
| `src/onboarding.ts` | Seria powitalna: mail po rejestracji, w dniu 2 i 5 |
| `src/webhooks.ts` | Webhooki wychodzące z podpisem HMAC |
| `src/routes-offers.ts` | Oferty: numer, strona dla klienta, akceptacja |
| `src/reports.ts` | Raport tygodniowy dla administratorów |
| `src/monitor.ts` | Alerty o błędach na webhook, zgłoszenia błędów z przeglądarki |
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
| `GET /api/auth/oauth/providers` | każdy | Włączone logowania: Google, Microsoft |
| `GET /api/auth/oauth/:dostawca/start`, `…/callback` | każdy | Logowanie przez Google lub Microsoft; `?mode=link` łączy z zalogowanym kontem, `?invite=` przyjmuje zaproszenie |
| `POST /api/auth/oauth/complete`, `/totp` | w trakcie logowania | Nazwa nowej firmy, kod 2FA po logowaniu przez dostawcę |
| `GET`, `DELETE /api/me/identities` | zalogowany | Połączone konta logowania |
| `GET /api/nip/:nip` | zalogowany | Nazwa, adres i miasto firmy z Białej listy MF |
| `GET`, `POST`, `DELETE /api/org/forms` | admin | Formularze leada na stronę |
| `POST /api/public/forms/:id` | każdy (CORS) | Zgłoszenie z formularza lub webhooka: firma, kontakt, lead, notatka |
| `POST /api/client-errors` | każdy | Błąd JavaScript z przeglądarki do logu |
| `GET /api/org/mailbox`, `POST` | zalogowany (tworzy admin) | Adres BCC firmy |
| `POST /api/public/inbound/:sekret` | dostawca poczty | Wiadomość przychodząca do zapisania w historii |
| `GET`, `POST`, `DELETE /api/org/webhooks`, `POST …/:id/test` | admin | Webhooki wychodzące |
| `POST /api/offers`, `GET /api/offers?deal=`, `POST /api/offers/:id/withdraw` | zalogowany (bez podglądu) | Oferty do szansy |
| `GET /oferta/:id`, `POST /api/public/offers/:id/accept` | klient z linkiem | Strona oferty i akceptacja |
| `GET /health` | każdy | Stan serwera i bazy |

## Logowanie Google i Microsoft

Gdy w konfiguracji są `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` (albo odpowiedniki `MICROSOFT_…`), na ekranie logowania pojawiają się przyciski „Kontynuuj z Google” i „Kontynuuj z Microsoft”. Przepływ to OpenID Connect z kodem autoryzacji i PKCE; `state` i `nonce` są jednorazowe i ważne 10 minut.

| Sytuacja | Co się dzieje |
| --- | --- |
| Konto Google lub Microsoft już połączone | Logowanie, a przy włączonej 2FA jeszcze kod z aplikacji |
| Google z potwierdzonym adresem, który ma konto w Hermesie | Połączenie kont i logowanie |
| Microsoft z adresem, który ma konto w Hermesie | Odmowa z prośbą o zalogowanie hasłem i połączenie konta w Ustawieniach, bo Microsoft nie zawsze potwierdza adres |
| Link z zaproszeniem | Przyjęcie, gdy potwierdzony adres Google zgadza się z zaproszeniem |
| Nowa osoba | Pytanie o nazwę firmy i założenie konta administratora (gdy `SIGNUP=open`) |

Konto założone przez Google lub Microsoft nie ma hasła; można je ustawić w Ustawieniach. Ostatniego sposobu logowania nie da się odłączyć.

## Maile

Wysyłka idzie przez dowolny serwer SMTP (`SMTP_URL`, nadawca w `MAIL_FROM`): zaproszenia, link do nowego hasła (sam albo od administratora) i poranny plan dnia. Wiadomości mają wersję tekstową i prostą wersję HTML w kolorach Hermesa. Prośba o reset dla nieznanego adresu nie wysyła maila i nie zdradza, czy konto istnieje.

## Zadania i poranny plan

Zadania (`task`) synchronizują się jak pozostałe rekordy i podlegają tym samym zasadom widoczności co ich lead lub szansa. Codziennie o `DIGEST_HOUR` (domyślnie 7:00 czasu polskiego) każda osoba z rolą administratora lub handlowca dostaje mail z zadaniami i krokami z terminem na dziś lub wcześniej, jeśli takie ma. Plan wychodzi raz dziennie (tabela `digests`); każdy wyłącza go w Ustawieniach. Pusty `DIGEST_HOUR` wyłącza wysyłkę na serwerze.

## Formularz leada i webhook

Administrator tworzy formularz w Ustawieniach → Ogólne i dostaje adres oraz gotowy kod HTML. Adres przyjmuje zwykły formularz HTML (z polem `redirect` przekierowuje po wysłaniu na stronę podziękowania) i JSON z Zapiera, Make czy własnego skryptu. Pola: `name`, `email`, `phone`, `company`, `message`, opcjonalnie `value` i `source`. Ukryte pole `website` odsiewa boty, a limit to 20 zgłoszeń na godzinę z jednego adresu IP. Zgłoszenie tworzy albo odnajduje firmę i kontakt (po nazwie i adresie email), zakłada leada ze źródłem „Strona www”, krokiem na dziś i opiekunem administratorem oraz zapisuje wiadomość w historii.

## Maile w historii przez BCC

To droga do automatycznego zapisu maili bez czekania na weryfikację dostępu do Gmaila. Każda firma dostaje adres w postaci `hermes-<losowy ciąg>@INBOUND_DOMAIN`. Handlowiec dodaje go jako ukrytą kopię, gdy pisze do klienta, albo przekazuje na niego mail od klienta.

1. Dostawca poczty przychodzącej przyjmuje wiadomość dla domeny `INBOUND_DOMAIN` i wysyła ją na `POST /api/public/inbound/<INBOUND_SECRET>`.
2. Hermes rozpoznaje firmę po adresie skrzynki. Gdy nadawcą jest ktoś z zespołu, klientami są odbiorcy; w przeciwnym razie klientem jest nadawca.
3. Każdy klient dostaje wpis „Email” w historii kontaktu (widoczny też w jego szansach i firmie), z tematem i treścią bez cytowanej odpowiedzi. Ta sama wiadomość nie zapisze się drugi raz.
4. Nieznany adres tworzy nowy kontakt; firmę Hermes przypisuje po domenie strony, pomijając darmowe skrzynki (gmail.com, wp.pl, onet.pl i podobne).

Obsługiwane formaty: Postmark Inbound (JSON), prosty JSON (`from`, `to`, `cc`, `subject`, `text`, `date`, `messageId`, np. z workera Cloudflare Email Routing) oraz formularz w stylu Mailgun. Nowy adres BCC unieważnia poprzedni.

## Webhooki (Zapier, Make)

Administrator dodaje w Ustawieniach adres `https://` i wybiera zdarzenia: `lead.created`, `lead.status_changed`, `deal.created`, `deal.stage_changed`, `deal.won`, `deal.lost`, `offer.accepted`. Zdarzenia powstają przy synchronizacji (porównanie poprzedniej i nowej wersji rekordu), przy leadach z formularza i przy akceptacji oferty. Treść to JSON z polami `event`, `label`, `at`, `org`, `data` (rekord z `company_name` i `contacts_detail`) oraz `previous` przy zmianach. Nagłówek `x-hermes-signature: sha256=…` to HMAC SHA 256 treści z sekretem pokazanym raz przy tworzeniu. Nieudana dostawa jest ponawiana raz, a wynik ostatniej widać w Ustawieniach. Firma ma najwyżej 10 webhooków.

## Oferty

Oferta zapisuje kopię pozycji z szansy (nazwa, ilość, jednostka, cena netto, rabat, VAT), dane sprzedawcy z Ustawień (`offer` w ustawieniach firmy), nabywcę i termin ważności. Numer ma postać `PREFIKS/RRRR/MM/NNN` z licznikiem w miesiącu. Link `/oferta/<id>` ma 24 losowe znaki i nie jest indeksowany. Pierwsze otwarcie przez klienta (bez sesji Hermesa) i akceptacja zapisują się w historii szansy; akceptacja wysyła też mail do autora i zdarzenie `offer.accepted`. Po terminie ważności albo po wycofaniu oferty nie da się zaakceptować.

## Raport tygodniowy

W poniedziałek około 8:00 administratorzy dostają podsumowanie poprzedniego tygodnia: wygrane i ich wartość, nowe leady i szanse, przegrane, otwarty lejek i szanse bez kroku, a do tego wiersz dla każdego opiekuna z liczbą aktywności. Ten sam zestaw liczb dla dowolnego okresu pobierzesz w Analityce przyciskiem „Raport CSV” w module Zespół.

## Seria powitalna

Po założeniu firmy administrator dostaje mail powitalny z trzema pierwszymi krokami. W dniu 2 przychodzi podpowiedź zależna od stanu konta (import, gdy lejek jest pusty; formularz, BCC i NIP, gdy już są dane), a w dniu 5 zachęta do zaproszenia zespołu albo wskazówki pracy w zespole. Każdy krok wychodzi raz, około 10:00. `ONBOARDING_MAILS=false` wyłącza serię.

## Dane firmy po NIP

W formularzu nowej firmy przycisk „Pobierz dane z rejestru” sprawdza sumę kontrolną NIP i pobiera z Białej listy Ministerstwa Finansów nazwę (w czytelnej postaci, np. „Alfa Soft Sp. z o.o.”), adres i miasto. Na serwerze zapytanie idzie przez `/api/nip/:nip` z limitem 60 na godzinę na firmę; w trybie lokalnym przeglądarka pyta rejestr bezpośrednio, o ile na to pozwala.

## Aplikacja na telefon

Serwer udostępnia manifest, ikony i service worker, więc Hermesa można zainstalować na telefonie i komputerze („Dodaj do ekranu początkowego”). Szkielet aplikacji jest w pamięci podręcznej, a dane zawsze przychodzą z serwera; bez sieci zainstalowana aplikacja pokazuje komunikat o braku połączenia zamiast pustych danych lokalnych. Poniżej 600 px układ przechodzi na wersję telefonu: przewijane menu, kompaktowy górny pasek, panele jeden pod drugim.

## Monitoring

Każda odpowiedź ma nagłówek `x-request-id`, a komunikat o błędzie serwera podaje ten numer użytkownikowi. Błąd 500 wysyła alert na `ALERT_WEBHOOK_URL` (Slack, Teams, Discord; najwyżej jeden na minutę). Błędy JavaScript z przeglądarki trafiają do logu serwera z identyfikatorem firmy i osoby. `/health` zwraca stan bazy, czas działania, wersję i to, czy działa wysyłka maili. Logi nie zawierają ciasteczek ani nagłówka `authorization`.

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

Szyfrowane kopie bazy i HTTPS opisuje [wdrożenie](wdrozenie.md).
