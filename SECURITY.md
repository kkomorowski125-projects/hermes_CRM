# Bezpieczeństwo

## Zgłaszanie podatności

Jeśli znajdziesz podatność, nie zgłaszaj jej w publicznych Issues. Napisz prywatnie do opiekuna repozytorium przez [zgłoszenie bezpieczeństwa na GitHubie](https://github.com/kkomorowski125-projects/hermes_CRM/security/advisories/new). Odpowiemy w ciągu 7 dni.

## Model bezpieczeństwa prototypu

Hermes w wersji 0.9 to prototyp działający w całości w przeglądarce:

- dane są zapisane w `localStorage` tej przeglądarki i nigdzie nie są wysyłane, z wyjątkiem trybu Hermes AI z kluczem (patrz niżej);
- wszystkie wartości wpisane przez użytkownika są escapowane przed wstawieniem do HTML;
- klucz Claude API jest trzymany w `localStorage` i wysyłany bezpośrednio do API Anthropic. **Tego nie wolno robić w produkcji.** Nie używaj klucza z dużym limitem i nie udostępniaj przeglądarki z zapisanym kluczem;
- w trybie z kluczem dane CRM są wysyłane do API Anthropic przy każdym pytaniu;
- rozpoznawanie mowy w Chrome korzysta z serwerów Google.

Wymagania bezpieczeństwa wersji produkcyjnej (serwery w UE, szyfrowanie, role, log zmian, RODO, klucze tylko na serwerze) są opisane w fazie 1 [roadmapy](docs/roadmapa.md).
