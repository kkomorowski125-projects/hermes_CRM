# Wdrożenie

Hermes działa jako jeden kontener z serwerem i aplikacją oraz baza PostgreSQL. Wystarczy dowolny serwer w UE z Dockerem, np. Hetzner, OVHcloud albo Scaleway.

## Docker Compose

```bash
git clone https://github.com/kkomorowski125-projects/hermes_CRM.git
cd hermes_CRM
cp .env.example .env      # uzupełnij PUBLIC_URL, POSTGRES_PASSWORD, opcjonalnie ANTHROPIC_API_KEY
docker compose up -d --build
```

Aplikacja działa na porcie 3000. Pierwsze konto założone na ekranie logowania tworzy firmę i zostaje jej administratorem. Gdy firma jest już założona, ustaw `SIGNUP=closed`, żeby kolejne osoby dołączały wyłącznie przez zaproszenia.

## Zmienne środowiskowe

| Zmienna | Domyślnie | Znaczenie |
| --- | --- | --- |
| `DATABASE_URL` | puste | PostgreSQL; puste oznacza SQLite w `SQLITE_PATH` |
| `SQLITE_PATH` | `server/data/hermes.db` | Plik bazy SQLite (w obrazie `/data/hermes.db`) |
| `PORT`, `HOST` | `3000`, `0.0.0.0` | Adres nasłuchu |
| `PUBLIC_URL` | `http://localhost:3000` | Adres aplikacji w linkach zaproszeń i resetu hasła |
| `SECURE_COOKIES` | `false` | `true` za HTTPS, ciasteczko sesji tylko przez szyfrowane połączenie |
| `SIGNUP` | `open` | `closed` wyłącza zakładanie nowych firm |
| `SESSION_DAYS` | `30` | Ważność sesji |
| `ANTHROPIC_API_KEY` | puste | Klucz Claude API; puste oznacza Hermes AI w trybie lokalnym |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Model Claude |
| `AI_DAILY_LIMIT` | `200` | Liczba zapytań AI na firmę dziennie |
| `NODE_ENV` | w obrazie `production` | Poza `production` linki resetu hasła wracają w odpowiedzi API |
| `LOG_LEVEL` | `info` | Poziom logów |
| `SMTP_URL`, `MAIL_FROM` | puste | Wysyłka maili (sekcja Maile) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | puste | Logowanie Google |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT` | puste, `common` | Logowanie Microsoft |
| `DIGEST_HOUR` | `7` | Godzina porannego planu (czas polski); puste wyłącza |
| `ALERT_WEBHOOK_URL` | puste | Alerty o błędach serwera |
| `BACKUP_PASSPHRASE`, `BACKUP_HOUR`, `BACKUP_KEEP_DAYS` | puste, `1`, `14` | Szyfrowane kopie bazy |
| `DOMAIN`, `APP_PORT` | puste, `3000` | Domena dla Caddy, port aplikacji na serwerze |
| `INBOUND_DOMAIN`, `INBOUND_SECRET` | puste | Maile w historii przez BCC |
| `ONBOARDING_MAILS` | `true` | Seria powitalna dla nowych firm |

## HTTPS

Najprościej przez wbudowany profil z Caddy: ustaw w `.env` `DOMAIN=crm.twojafirma.pl`, `PUBLIC_URL=https://crm.twojafirma.pl`, `SECURE_COOKIES=true`, `APP_PORT=127.0.0.1:3000` i uruchom:

```bash
docker compose --profile https up -d --build
```

Caddy sam pobierze certyfikat Let's Encrypt (domena musi wskazywać na serwer, porty 80 i 443 otwarte). Jeśli masz już własny serwer proxy, wystarczy taki wpis:

```
crm.twojafirma.pl {
  reverse_proxy localhost:3000
}
```

Potem ustaw `PUBLIC_URL=https://crm.twojafirma.pl` i `SECURE_COOKIES=true`.

## Kopie zapasowe

- **Baza:** usługa `backup` co noc (domyślnie o 1:00 UTC, `BACKUP_HOUR`) zapisuje do `./backups` zrzut bazy skompresowany i zaszyfrowany AES 256 hasłem z `BACKUP_PASSPHRASE`. Przechowuje 14 dni (`BACKUP_KEEP_DAYS`). Bez hasła kopie są wyłączone. Kopię na żądanie robi `docker compose run --rm backup now`. Folder `backups` kopiuj regularnie poza serwer (np. do magazynu obiektów w UE).
- **Odtworzenie:** `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in plik.sql.gz.enc | gunzip | docker compose exec -T db psql -U hermes hermes`. Sprawdzaj odtworzenie raz w miesiącu na kopii testowej.
- **Kopia z aplikacji:** administrator pobiera plik JSON w Ustawieniach → Ogólne. Ten sam format wczytuje się w prototypie i na serwerze (`POST /api/import`).

## Maile

Ustaw `SMTP_URL` (np. `smtps://użytkownik:hasło@smtp.dostawca.pl:465`) i `MAIL_FROM` (np. `Hermes CRM <crm@twojafirma.pl>`). Pasuje każdy dostawca SMTP: Postmark, Mailgun, Amazon SES, SMTP2GO albo skrzynka firmowa. Dodaj rekordy SPF i DKIM domeny nadawcy, żeby maile nie trafiały do spamu. `/health` pokazuje `"mail": true`, gdy wysyłka jest skonfigurowana.

## Logowanie Google i Microsoft

- **Google:** w Google Cloud Console utwórz klienta OAuth typu „Aplikacja internetowa”, dodaj adres przekierowania `https://twoja-domena/api/auth/oauth/google/callback` i wpisz `GOOGLE_CLIENT_ID` oraz `GOOGLE_CLIENT_SECRET`. Zakresy: `openid`, `email`, `profile`.
- **Microsoft:** w Microsoft Entra (Rejestracje aplikacji) dodaj aplikację z typem konta „dowolna organizacja i konta osobiste”, przekierowanie internetowe `https://twoja-domena/api/auth/oauth/microsoft/callback`, utwórz klucz tajny i wpisz `MICROSOFT_CLIENT_ID` oraz `MICROSOFT_CLIENT_SECRET`. `MICROSOFT_TENANT` zostaw `common` albo wpisz identyfikator jednej organizacji.

## Maile w historii (BCC)

1. Wybierz poddomenę na pocztę przychodzącą, np. `in.twojafirma.pl`, i wpisz ją jako `INBOUND_DOMAIN`.
2. Wygeneruj długi losowy `INBOUND_SECRET` (np. `openssl rand -hex 24`).
3. Skieruj pocztę tej poddomeny do dostawcy, który przekazuje ją webhookiem:
    - **Postmark Inbound:** rekord MX poddomeny na `inbound.postmarkapp.com`, a w ustawieniach serwera Postmark adres webhooka `https://twoja-domena/api/public/inbound/<INBOUND_SECRET>`.
    - **Cloudflare Email Routing:** reguła „catch all” dla poddomeny kierująca do workera, który wysyła `from`, `to`, `subject`, `text` jako JSON na ten sam adres.
4. W Ustawieniach Hermesa administrator klika „Utwórz adres BCC” i przekazuje adres zespołowi.

## Monitoring

Ustaw `ALERT_WEBHOOK_URL` na webhook kanału w Slacku, Teams albo Discordzie, a błędy serwera przyjdą jako wiadomości z numerem zgłoszenia. Do sprawdzania dostępności podłącz zewnętrzny monitor (np. UptimeRobot, Better Stack) pod `https://twoja-domena/health`. Logi czytasz poleceniem `docker compose logs -f app`.

## Aktualizacja

```bash
git pull
docker compose up -d --build
```

Migracje bazy uruchamiają się same przy starcie serwera.

## Przejście z prototypu

1. W prototypie pobierz kopię zapasową (Ustawienia → Ogólne → Pobierz kopię).
2. Na serwerze zaloguj się jako administrator i wczytaj tę kopię w tym samym miejscu.
3. Zaproś zespół. Opiekunowie rekordów to imiona i nazwiska, więc osoby powinny przy zaproszeniu podać takie same, jak w profilach handlowców w prototypie.
