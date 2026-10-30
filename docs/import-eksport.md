# Import i eksport danych

Dane wgrywasz z plików CSV (np. z Excela, Google Sheets albo innego CRM), a wyciągasz jako CSV dla każdego obiektu osobno albo jako jedną kopię zapasową JSON.

## Import CSV

1. Na liście obiektu kliknij ikonę importu (albo ikonę w górnym pasku).
2. Wybierz plik, przeciągnij go albo wklej dane.
3. Sprawdź dopasowanie kolumn. Hermes rozpoznaje je po nazwach i aliasach, każdą możesz zmienić albo pominąć.
4. Kliknij „Importuj”. Powiadomienie pokaże, ile rekordów dodano i ile duplikatów pominięto.

**Format pliku:**

- pierwszy wiersz to nagłówki;
- separator: średnik, przecinek albo tabulator (wykrywany automatycznie);
- kodowanie UTF-8, także z BOM (eksport z Excela);
- daty jako `RRRR-MM-DD` albo `DD.MM.RRRR`;
- kwoty z odstępami, przecinkiem i dopiskiem „zł” są rozumiane (`12 500,00 zł`).

## Kolumny dla obiektów

| Obiekt | Kolumny |
| --- | --- |
| Firmy | Nazwa (wymagana), Domena, Branża, Miasto, Pracownicy, NIP |
| Kontakty | Imię i nazwisko (wymagane), Email, Telefon, Firma, Stanowisko |
| Leady | Nazwa leada albo Firma albo Osoba kontaktowa (jedna z nich wymagana), Status, Dopasowanie do ICP, Źródło, Szacowana wartość, Następny krok, Termin kroku, Opiekun, Powód odrzucenia, Osoba kontaktowa, Email osoby, Telefon osoby |
| Szanse | Nazwa szansy (wymagana), Firma, Wartość, Etap, Następny krok, Termin kroku, Planowane zamknięcie, Opiekun, Powód przegranej, Osoba kontaktowa, Email osoby, Telefon osoby |

Własne pola z Ustawień też są dostępne do dopasowania. Przycisk „Pobierz szablon” w oknie importu zapisuje plik z poprawnymi nagłówkami.

**Rozpoznawane aliasy (przykłady):** `email`, `e-mail`, `mail`; `telefon`, `tel`, `phone`; `firma`, `company`, `organizacja`; `wartość`, `kwota`, `amount`; `etap`, `stage`; `źródło`, `source`; `osoba`, `kontakt`, `contact name`.

## Co dzieje się z powiązaniami

- **Firma** podana tekstem jest dopasowana do istniejącej po nazwie (bez wielkości liter i polskich znaków). Gdy jej nie ma, Hermes ją tworzy.
- **Osoba kontaktowa** przy leadzie i szansie jest dopasowana po emailu, a potem po imieniu i firmie. Brakującą Hermes tworzy i od razu wiąże.
- **Listy wyboru** (status, etap, źródło) przyjmują tylko znane wartości; nieznane są pomijane.

## Duplikaty

| Obiekt | Uznawany za duplikat, gdy |
| --- | --- |
| Firma | Ta sama nazwa |
| Kontakt | Ten sam email albo ta sama nazwa |
| Lead | Ta sama nazwa wśród otwartych leadów |
| Szansa | Ten sam email (szanse o tej samej nazwie są dozwolone) |

## Eksport CSV

Eksport z listy albo z Ustawień → Ogólne zapisuje wszystkie rekordy obiektu z kolumnami:

- wszystkie pola (także własne), powiązania jako nazwy;
- dla leadów i szans: główna osoba kontaktowa z emailem i telefonem oraz lista wszystkich kontaktów;
- „Ostatni kontakt” i „Utworzono”.

Plik ma separator średnik i BOM, więc Excel otwiera go z poprawnymi polskimi znakami.

## Kopia zapasowa JSON

Ustawienia → Ogólne → „Pobierz kopię” zapisuje wszystkie dane, ustawienia, nazwy pól i pola własne w jednym pliku. „Wczytaj kopię” przywraca je w całości, także w innej przeglądarce. Kopia ze starszej wersji Hermesa jest automatycznie przenoszona do bieżącego modelu. Klucz Claude API nie trafia do kopii. Format pliku jest opisany w [model-danych.md](model-danych.md#zapis-w-przeglądarce).
