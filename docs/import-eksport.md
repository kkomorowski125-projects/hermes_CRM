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

## Import z Pipedrive, HubSpot i Livespace

Eksport z innego CRM wgrywasz tak samo jak zwykły plik CSV. Hermes rozpoznaje źródło po nagłówkach i pokazuje to w oknie dopasowania.

| Źródło | Co rozpoznajemy |
| --- | --- |
| Pipedrive | Kolumny z przedrostkami `Deal -`, `Organization -`, `Person -` (także polskie `Transakcja -`, `Organizacja -`, `Osoba -`), status `open`, `won`, `lost` |
| HubSpot | `Deal Name`, `Amount`, `Deal Stage` (np. `closedwon`), `Close Date` z godziną, `Associated Company`, `Associated Contact`; dla kontaktów `First Name` i `Last Name` łączone w imię i nazwisko |
| Livespace | Polskie nazwy kolumn szans, etapów i osób |

**Etapy:** okno importu szans pokazuje każdy etap z pliku z liczbą szans i proponuje etap Twojego lejka: tę samą nazwę, wygraną i przegraną, a potem słowa kluczowe (np. „Proposal Made” to Oferta, „Negotiations Started” to Negocjacje). Każde przypisanie możesz zmienić. Status `won` i `lost` zamyka szansę niezależnie od etapu.

**Po imporcie** otwarte leady i szanse dostają następny krok na dziś (z podpowiedzi etapu), szanse bez daty zamknięcia planowane zamknięcie za 30 dni, a w historii każdego rekordu jest wpis, skąd pochodzi. Daty `RRRR-MM-DD GG:MM` z eksportów są rozumiane.

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
