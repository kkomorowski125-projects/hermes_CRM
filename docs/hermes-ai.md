# Hermes AI

Hermes AI to asystent wbudowany w CRM: odpowiada na pytania o dane, planuje dzień, wskazuje zagrożone szanse i pisze szkice wiadomości. Działa w czterech trybach, zależnie od tego, co jest dostępne.

| Tryb | Kiedy działa | Co potrafi |
| --- | --- | --- |
| Lokalny | Zawsze, bez klucza | Najczęstsze pytania, liczone z danych w przeglądarce |
| Claude API | Po wpisaniu klucza w Ustawieniach (bez serwera) | Dowolne pytania o dane w CRM |
| Claude przez serwer | Gdy serwer ma `ANTHROPIC_API_KEY` | Jak wyżej, klucz tylko na serwerze, limit dzienny na firmę |
| Claude w artefakcie | Gdy aplikacja jest otwarta jako artefakt na claude.ai | Dopracowanie pól w Hermes Voice, po zgodzie użytkownika |

## Gdzie go znajdziesz

- **„Ask Hermes AI”** w górnym pasku albo `⌘J`. Panel otwiera się z prawej strony.
- **„Zapytaj AI”** na karcie rekordu i w panelu firmy lub kontaktu. Pytania bez nazwy dotyczą wtedy tego rekordu.
- **Podpowiedzi kroków** w oknie następnego kroku i propozycje „Ustaw jako następny krok” w odpowiedziach.
- **Mikrofon** w polu pytania pozwala zadać pytanie głosem.

## Tryb lokalny

Bez klucza Hermes rozpoznaje intencję po słowach kluczowych i liczy odpowiedź z danych:

| Pytanie | Odpowiedź |
| --- | --- |
| Co mam dziś zrobić? | Lista „Na dziś” i jedna rzecz o największej stawce |
| Które szanse są zagrożone? | Szanse z krokiem po terminie, bez kroku, długo w etapie, bez kontaktu od 14 dni, po planowanym zamknięciu, duże z jedną osobą po stronie klienta |
| Jak idzie sprzedaż w tym miesiącu? | Wygrane względem celu, lejek, prognoza ważona, zamknięcia planowane na ten miesiąc |
| Którym leadem zająć się najpierw? | Otwarte leady: najpierw pasujące do ICP, potem z najlepszych źródeł; czas czekania |
| Podsumuj … | Stan rekordu, kontakty, ryzyka i trzy ostatnie wpisy z historii |
| Czy skonwertować go na szansę? | Rada na podstawie statusu i ICP leada |
| Zasugeruj następny krok | Krok z podpowiedzi etapu i termin, z przyciskiem do ustawienia |
| Napisz follow up do … | Szkic emaila dopasowany do etapu i ostatniego kontaktu, z kopiowaniem, otwarciem w poczcie i zapisem w historii |

## Tryb Claude API

W Ustawieniach → Ogólne wpisz klucz Claude API i model (domyślnie `claude-sonnet-5-5`). Każde pytanie wysyła do API:

- instrukcję systemową (rola, język, zasady pisania, podpis z profilu, kontekst otwartego rekordu);
- dane CRM jako JSON: leady, szanse, firmy, kontakty, 80 ostatnich wpisów historii, cel i wynik miesiąca;
- ostatnie 14 wiadomości rozmowy.

Gdy połączenie się nie uda, Hermes odpowiada w trybie lokalnym i pokazuje komunikat błędu.

## Bezpieczeństwo

- Klucz jest zapisany tylko w tej przeglądarce (`hermes-ai-config`) i nie trafia do kopii zapasowej.
- Zapytania idą z przeglądarki prosto do API Anthropic z nagłówkiem `anthropic-dangerous-direct-browser-access`. To rozwiązanie tylko na prototyp.
- W trybie z kluczem dane CRM są wysyłane do API Anthropic. Użytkownik jest o tym informowany w Ustawieniach.
- W trybie serwera przeglądarka wysyła pytanie do `POST /api/ai/messages`, a serwer dodaje klucz, wybiera model i liczy zużycie (`AI_DAILY_LIMIT`, domyślnie 200 zapytań dziennie na firmę). Pole klucza znika z Ustawień, a zamiast niego widać stan i dzisiejsze zużycie. Pierwsze zapytanie dnia trafia do dziennika zmian ([serwer](serwer.md)).

## Zasady odpowiedzi

Hermes odpowiada po polsku, krótko, jak doświadczony handlowiec. Opiera się wyłącznie na danych z CRM i nie wymyśla faktów. Proponując działania, podaje konkretny krok z terminem. Wiadomości pisze w formie „Pan/Pani”, podpisane imieniem z profilu, bez myślników i półpauz.
