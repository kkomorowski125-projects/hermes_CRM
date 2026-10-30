# Hermes Voice

Hermes Voice zamienia jedno nagranie w gotowe, powiązane rekordy: firmę, kontakt, leada i szansę. Handlowiec mówi tak, jak opowiedziałby o kliencie koledze, a Hermes wypełnia pola.

## Gdzie jest w interfejsie

| Miejsce | Co robi |
| --- | --- |
| Ikona mikrofonu przy przycisku dodawania w górnym pasku albo klawisz `V` | Rozpoznaje wszystko, co padło w nagraniu |
| Ikona mikrofonu przy „Dodaj leada”, „Dodaj szansę” itd. na listach | Jak wyżej, ale zawsze tworzy rekord danego typu |
| „Wypełnij głosem” w formularzu dodawania | Jak wyżej, dla typu formularza |
| „Powiedz” na liście „Zacznij tutaj” | Pierwszy lead głosem |
| Mikrofon w notatkach i w polu Hermes AI | Dyktowanie samego tekstu, bez rozpoznawania pól |

## Jak przebiega nagranie

1. **Nasłuch.** Okno pokazuje słowa na żywo, a kliknięcie mikrofonu zatrzymuje nagrywanie. Gdy mikrofon jest niedostępny, okno przechodzi na wpisywanie tekstu. Trzy przykładowe zdania pozwalają wypróbować funkcję bez mówienia.
2. **Rozpoznanie.** „Rozpoznaj dane” uruchamia lokalny parser. Gdy dostępny jest Claude, Hermes AI dopracowuje pola w tle.
3. **Podgląd.** Cztery karty (Firma, Kontakt, Lead, Szansa) z polami do poprawienia i przełącznikiem „utworzę / pomiń”. Gdy firma lub osoba już istnieje, karta to pokazuje.
4. **Zapis.** Kontakt dostaje firmę, lead i szansa dostają firmę i kontakt. Treść nagrania trafia do historii jako notatka głosowa. Gdy w nagraniu są lead i szansa, lead od razu jest skonwertowany na tę szansę. Lead i szansa bez kroku dostają krok domyślny.

## Co rozpoznaje parser

| Informacja | Przykłady wypowiedzi | Wynik |
| --- | --- | --- |
| Lead | „nowy lead Kwiaciarnia Róża” | Lead i firma |
| Szansa | „szansa Wdrożenie sklepu dla firmy Meble Dębowe” | Szansa i firma |
| Firma | „firma Beta Soft”, „w firmie Alfa”, „klient Delta” | Nazwa firmy |
| Kontakt | „kontakt Anna Mazur”, „rozmawiałem z Ewą Kowalską” | Imię i nazwisko w mianowniku |
| Stanowisko | „właścicielka”, „dyrektor sprzedaży”, „stanowisko prezes” | Stanowisko |
| Telefon | „telefon 501 300 200” | `501 300 200` |
| Email | „email piotr małpa alfa kropka pl” | `piotr@alfa.pl` |
| Kwota | „za 40 tysięcy”, „wartość pięćdziesiąt tysięcy złotych”, „120000 zł” | Liczba w zł |
| Etap | „etap oferta” | Etap z ustawień lejka |
| Źródło | „źródło polecenie”, „z targów” | Źródło leada |
| Krok i termin | „następny krok zadzwonić jutro”, „w piątek”, „za tydzień”, „15 listopada” | Krok i data |
| Miasto, branża, domena | „z Krakowa”, „branża IT”, „strona alfa kropka pl” | Pola firmy |

**Zasady decyzji:** słowo „szansa”, „deal” albo etap tworzy szansę. Słowo „lead”, źródło, krok albo kwota bez szansy tworzy leada. Gdy w nagraniu nie ma żadnej z tych informacji, Hermes proponuje leada z pierwszego zdania.

## Dopracowanie przez AI

Gdy w Ustawieniach jest klucz Claude API (albo aplikacja działa jako artefakt na claude.ai i użytkownik się zgodzi), transkrypcja trafia do Claude z instrukcją zwrócenia JSON w tym samym kształcie co parser. Wynik uzupełnia pola, których parser nie znalazł, i może zmienić decyzję, które rekordy utworzyć. Nieznane etapy i źródła są odrzucane. Gdy AI jest niedostępne, zostaje wynik parsera.

## Wymagania i ograniczenia

- Rozpoznawanie mowy zapewnia przeglądarka (Web Speech API, język `pl-PL`): Chrome, Edge i Safari. Firefox go nie obsługuje.
- Chrome przetwarza mowę na serwerach Google. W wersji produkcyjnej rozpoznawanie przeniesiemy na własny serwer ([roadmapa](roadmapa.md)).
- Gdy przeglądarka blokuje mikrofon (np. w podglądzie na claude.ai), można wpisać tekst albo użyć dyktowania systemowego: na Macu dwa razy Fn, w Windows Win + H.
- Parser rozpoznaje typowe formy wypowiedzi. Nietypowe zdania zawsze można poprawić w podglądzie przed zapisem.
