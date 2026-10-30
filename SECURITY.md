# Bezpieczeństwo

## Zgłaszanie podatności

Jeśli znajdziesz podatność, nie zgłaszaj jej w publicznych Issues. Napisz prywatnie do opiekuna repozytorium przez [zgłoszenie bezpieczeństwa na GitHubie](https://github.com/kkomorowski125-projects/hermes_CRM/security/advisories/new). Odpowiemy w ciągu 7 dni.

## Tryb serwera

Gdy aplikację serwuje serwer z folderu `server/`:

- hasła są haszowane algorytmem scrypt, sesje to losowe tokeny w ciasteczku httpOnly, a w bazie jest tylko ich skrót;
- dostępna jest weryfikacja dwuetapowa TOTP, a logowanie ma limit prób;
- zapytania zmieniające dane wymagają nagłówka `x-hermes` (ochrona przed CSRF);
- role i widoczność rekordów są sprawdzane na serwerze, nie tylko w interfejsie;
- klucz Claude API jest wyłącznie w zmiennych środowiskowych serwera, a zużycie AI ma dzienny limit na firmę;
- zmiany danych, logowania, eksporty i operacje RODO trafiają do dziennika zmian.

Za HTTPS ustaw `SECURE_COOKIES=true` ([wdrożenie](docs/wdrozenie.md)). Szczegóły w [docs/serwer.md](docs/serwer.md#bezpieczeństwo).

## Tryb lokalny (prototyp)

Bez serwera Hermes działa w całości w przeglądarce:

- dane są zapisane w `localStorage` tej przeglądarki i nigdzie nie są wysyłane, z wyjątkiem trybu Hermes AI z kluczem (patrz niżej);
- wszystkie wartości wpisane przez użytkownika są escapowane przed wstawieniem do HTML;
- klucz Claude API jest trzymany w `localStorage` i wysyłany bezpośrednio do API Anthropic. **Tego nie wolno robić w produkcji.** Nie używaj klucza z dużym limitem i nie udostępniaj przeglądarki z zapisanym kluczem;
- w trybie z kluczem dane CRM są wysyłane do API Anthropic przy każdym pytaniu;
- rozpoznawanie mowy w Chrome korzysta z serwerów Google.

Pozostałe wymagania wersji produkcyjnej (szyfrowane kopie bazy, monitoring, umowa powierzenia) są w fazie 1 [roadmapy](docs/roadmapa.md).
