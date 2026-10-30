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

## HTTPS

Postaw przed aplikacją serwer z certyfikatem, np. Caddy:

```
crm.twojafirma.pl {
  reverse_proxy localhost:3000
}
```

Potem ustaw `PUBLIC_URL=https://crm.twojafirma.pl` i `SECURE_COOKIES=true`.

## Kopie zapasowe

- **Baza:** codzienny zrzut, np. `docker compose exec db pg_dump -U hermes hermes | gzip > hermes-$(date +%F).sql.gz`, przechowywany poza serwerem i zaszyfrowany.
- **Kopia z aplikacji:** administrator pobiera plik JSON w Ustawieniach → Ogólne. Ten sam format wczytuje się w prototypie i na serwerze (`POST /api/import`).

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
