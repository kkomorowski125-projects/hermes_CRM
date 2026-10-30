# Jak współtworzyć Hermesa

Dziękujemy, że chcesz pomóc. Ten plik opisuje, jak przygotować środowisko, wprowadzić zmianę i zgłosić ją do przeglądu.

## Środowisko

```bash
git clone https://github.com/kkomorowski125-projects/hermes_CRM.git
cd hermes_CRM
npm install
npm test
```

Aplikację otwierasz bezpośrednio z pliku `index.html` albo przez lokalny serwer (`npm start`, adres http://localhost:4173). Mikrofon w Chrome działa w obu przypadkach po zezwoleniu.

## Praca nad zmianą

1. Utwórz gałąź od `main`: `funkcja/krotki-opis` albo `poprawka/krotki-opis`.
2. Wprowadź zmianę w `index.html`. Zasady budowy kodu są w [docs/architektura.md](docs/architektura.md), a zasady wyglądu i pisania w [docs/design-system.md](docs/design-system.md).
3. Dodaj albo popraw testy w `tests/` ([docs/testy.md](docs/testy.md)).
4. Uruchom `npm run check` i `npm test`.
5. Gdy zmienia się wygląd, odśwież zrzuty: `python3 tools/screenshots.py`.
6. Dopisz zmianę do [CHANGELOG.md](CHANGELOG.md) w sekcji najbliższej wersji.
7. Otwórz pull request według szablonu.

## Zasady

- **Teksty po polsku**, krótkie i konkretne, bez myślników i półpauz.
- **Bez nowych zależności w przeglądarce.** Prototyp ma działać z jednego pliku, offline.
- **Każda wartość od użytkownika przez `esc()`** przed wstawieniem do HTML.
- **Zmiana kształtu danych wymaga migracji** w `migrateDb()` i testu migracji.
- **Opisy commitów po polsku**, w trybie oznajmującym, pierwszy wiersz do 72 znaków: „Lejek leadów z przeciąganiem”.

## Zgłaszanie błędów i pomysłów

Użyj szablonów w zakładce Issues. Przy pomyśle podaj problem, który rozwiązuje, i proponowany priorytet według [roadmapy](docs/roadmapa.md#jak-ustalamy-priorytety).
