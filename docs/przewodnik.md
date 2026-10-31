# Przewodnik użytkownika

Hermes prowadzi Cię przez sprzedaż od pierwszego kontaktu do wygranej. Ten przewodnik opisuje każdy ekran i najważniejsze zasady pracy.

## Spis treści

1. [Pierwsze uruchomienie](#pierwsze-uruchomienie)
2. [Jak myśli Hermes: leady i szanse](#jak-myśli-hermes-leady-i-szanse)
3. [Pulpit i lista „Na dziś”](#pulpit-i-lista-na-dziś)
4. [Następny krok](#następny-krok)
5. [Lejek szans i lejek leadów](#lejek-szans-i-lejek-leadów)
6. [Listy obiektów](#listy-obiektów)
7. [Karta leada i karta szansy](#karta-leada-i-karta-szansy)
8. [Firmy i kontakty](#firmy-i-kontakty)
9. [Dodawanie rekordów i głos](#dodawanie-rekordów-i-głos)
10. [Wyszukiwarka](#wyszukiwarka)
11. [Analityka](#analityka)
12. [Kalendarz i umawianie spotkań](#kalendarz-i-umawianie-spotkań)
13. [Zespół i przegląd lejka](#zespół-i-przegląd-lejka)
14. [Hermes AI](#hermes-ai)
15. [Ustawienia](#ustawienia)
16. [Produkty i oferty](#produkty-i-oferty)
17. [Automatyzacje](#automatyzacje)
18. [Masowe akcje, widoki i duplikaty](#masowe-akcje-widoki-i-duplikaty)
19. [Cofanie i bezpieczeństwo danych](#cofanie-i-bezpieczeństwo-danych)

## Pierwsze uruchomienie

![Pusty Hermes z listą „Zacznij tutaj”](img/start-pusty.png)

Hermes startuje pusty. Lista **„Zacznij tutaj”** na Pulpicie prowadzi przez pięć kroków:

1. **Profil:** imię i nazwa firmy. Hermes podpisuje nimi szkice wiadomości i ustawia Cię jako opiekuna nowych rekordów.
2. **Cel sprzedaży na miesiąc:** podstawa postępu, prognozy i pokrycia celu.
3. **Firmy i kontakty:** z pliku CSV albo ręcznie.
4. **Pierwszy lead:** ręcznie, głosem albo jako szansa.
5. **Hermes AI** (opcjonalnie): klucz Claude API.

Chcesz najpierw zobaczyć aplikację w akcji? Kliknij **„Wczytaj dane demo”**. Usuniesz je w Ustawieniach przyciskiem „Wyczyść wszystko”.

## Jak myśli Hermes: leady i szanse

| | Lead | Szansa sprzedaży |
| --- | --- | --- |
| Kto to | Każdy potencjalny klient | Klient w procesie sprzedaży, który pasuje do ICP i jest zainteresowany |
| Etapy | Nowy, W kontakcie, Kwalifikacja | Edytowalne etapy lejka (domyślnie Nowe, Kontakt, Oferta, Negocjacje) |
| Zamknięcie | Konwersja na szansę albo odrzucenie z powodem | Wygrana albo przegrana z powodem |
| Wartość | Szacowana | Wartość i prognoza ważona |

**Konwersja** wymaga zaznaczenia, że klient pasuje do ICP i jest zainteresowany. Szansa przejmuje firmę, wszystkie kontakty i historię leada, a lead dostaje status „Skonwertowany” z linkiem do szansy.

## Pulpit i lista „Na dziś”

Pulpit zaczyna się od listy **„Na dziś”** i największych szans, a pod nimi są wskaźniki: wartość lejka z postępem celu, prognoza ważona, otwarte leady i liczba zadań na dziś. Nowe konto zamiast tego widzi kartę „Zacznij tutaj”.

Lista **„Na dziś”** zbiera:

- kroki z terminem na dziś i po terminie (czerwone), z leadów i szans;
- rekordy bez zaplanowanego kroku (żółte kółko z plusem);
- nowe leady, które czekają na pierwszy kontakt.

Kliknięcie kółka zamyka zadanie, a kliknięcie tytułu otwiera kartę rekordu. Przy każdej pozycji są **szybkie akcje**: telefon (na komputerze otwiera aplikację do dzwonienia, na telefonie od razu dzwoni), **„Napisz”** z szablonem wiadomości i **„Zrobione”**.

**Szablony wiadomości.** „Napisz” na liście, karcie rekordu i w podglądzie otwiera okno z gotowym tekstem: follow up, przypomnienie o ofercie, podziękowanie po spotkaniu, umówienie rozmowy. Hermes sam wstawia imię, formę „Pan” lub „Pani”, firmę i Twój podpis. Wiadomość otwiera się w Twojej poczcie, a w historii zostaje wpis. Własne szablony dodasz w Ustawieniach → Szablony.

Na telefonie aplikacja ma dolny pasek: Dziś, Lejek, przycisk „+” do szybkiego dodawania, Leady i Więcej.

## Następny krok

![Okno „Zrobione, co dalej?”](img/nastepny-krok.png)

To serce Hermesa. Każdy otwarty lead i każda otwarta szansa ma krok z terminem.

- **„Zrobione”** zamyka bieżący krok i od razu prosi o kolejny. Hermes podpowiada krok pasujący do etapu.
- W tym samym oknie zapisujesz **„Jak poszło?”**: rodzaj kontaktu (telefon, email, spotkanie, notatka), wynik rozmowy i krótką notatkę. Wpis trafia do historii, więc jeden klik zamyka krok i dokumentuje kontakt.
- Gdy dodajesz wpis w historii na karcie, zaznacz **„To zamyka krok”**, a Hermes od razu poprosi o kolejny.
- Zamiast kolejnego kroku możesz zamknąć rekord: szansę jako wygraną lub przegraną, leada przez konwersję lub odrzucenie.
- Okno nie zamyka się przez kliknięcie obok ani klawisz Esc. Krok możesz **świadomie pominąć krzyżykiem ✕**. Rekord trafia wtedy na listę „bez planu”, a w historii zostaje ślad.
- Ta sama zasada działa przy zmianie etapu lub statusu. Zmianę można cofnąć przyciskiem „Cofnij zmianę etapu”.

## Lejek szans i lejek leadów

![Lejek szans](img/lejek-szans.png)

**Lejek szans** to kanban z kolumną na każdy etap. Kolumna pokazuje sumę wartości i prawdopodobieństwo etapu, a karta pokazuje następny krok i oznaczenie szans stojących w etapie 14 dni lub dłużej. Przeciągnięcie karty do innej kolumny zmienia etap i pyta o następny krok. Przycisk **„Etapy”** prowadzi do edycji etapów.

![Lejek leadów](img/lejek-leadow.png)

**Lejek leadów** włączasz przełącznikiem „Szanse / Leady”. Kolumny to Nowy, W kontakcie, Kwalifikacja i Szansa sprzedaży (konwersje z 30 dni). Karta pokazuje ocenę ICP i czas czekania na pierwszy kontakt. Przeciągnięcie do kolumny „Szansa sprzedaży” otwiera konwersję, a odrzucone leady pokażesz przyciskiem.

Gdy w zespole jest więcej niż jedna osoba, oba lejki mają filtr opiekuna.

## Listy obiektów

![Lista leadów](img/lista-leadow.png)

Każdy obiekt (Leady, Szanse, Firmy, Kontakty) ma listę z:

- podsumowaniem w czterech kafelkach, z czwartym „wymaga uwagi”;
- filtrami: otwarte, skonwertowane, odrzucone, wygrane, przegrane, cisza 30+ dni;
- sortowaniem po kliknięciu w nagłówek kolumny (rosnąco, malejąco, bez sortowania);
- wyszukiwarką w obrębie listy i filtrem opiekuna;
- eksportem i importem CSV oraz przyciskiem dodawania z mikrofonem.

Na liście leadów status „Nowy” pokazuje, ile dni lead czeka na pierwszy kontakt.

## Karta leada i karta szansy

![Karta szansy](img/karta-szansy.png)

Kliknięcie leada lub szansy w dowolnym miejscu otwiera pełny ekran rekordu.

**Nagłówek:** nazwa (edytujesz ją, klikając), firma, główny kontakt, etap lub status, akcje Wygrana / Przegrana albo Konwertuj / Odrzuć, Zapytaj AI i Usuń. Pod nim klikalny pasek etapów i kluczowe liczby.

**Lewa kolumna:**

- **Następny krok** z przyciskami „Zrobione” i „Zmień”.
- **Kontakty:** dowolna liczba osób. Przycisk „Powiąż” otwiera wyszukiwarkę, w której możesz też utworzyć nową osobę. Hermes podpowiada osoby z tej samej firmy, a kontakt główny ustawiasz flagą. Odłączenie można cofnąć.
- **Firma:** powiązanie, zmiana lub odłączenie. Powiązanie kontaktu bez firmy uzupełnia firmę automatycznie.
- **Szczegóły:** wszystkie pola, także własne.
- **Powiązane rekordy:** źródłowy lead albo szansa z leada oraz inne rekordy tej firmy.

**Prawa kolumna:**

- **Dodawanie aktywności:** notatka, telefon, email, spotkanie. Przy telefonie wybierasz wynik rozmowy, a przy telefonie, emailu i spotkaniu osobę, z którą rozmawiałeś. Mikrofon pozwala dyktować treść.
- **Oś czasu** pogrupowana według dni, z filtrami. Na górze zaplanowany krok. Oś pokazuje też wpisy z kontaktów rekordu i ze źródłowego leada.

Pierwsza zapisana rozmowa z nowym leadem zmienia jego status na „W kontakcie”.

## Firmy i kontakty

Firmy i kontakty otwierają się w panelu bocznym. Panel zawiera dane do edycji, historię kontaktów i listę powiązanych leadów i szans. Przyciski **„Lead”** i **„Szansa”** tworzą nowy rekord od razu powiązany z tą firmą lub osobą. Historia firmy zbiera też wpisy jej kontaktów i szans.

## Dodawanie rekordów i głos

![Hermes Voice](img/glos-nasluch.png)

Przycisk dodawania w górnym pasku zmienia się zależnie od widoku: na Pulpicie dodaje leada, w Lejku szans szansę, na liście dany obiekt. Formularz leada i szansy od razu tworzy firmę i osobę kontaktową.

Ikona **mikrofonu** przy przycisku dodawania (albo klawisz `V`) otwiera Hermes Voice. Mówisz naturalnie, a Hermes rozpoznaje firmę, kontakt, leada i szansę, także wszystko naraz.

![Podgląd przed zapisem](img/glos-podglad.png)

Przed zapisem widzisz karty z polami do poprawienia i informację, które rekordy już istnieją. Zapis wiąże wszystko ze sobą, a treść nagrania trafia do historii jako notatka. Szczegóły w [Hermes Voice](hermes-voice.md).

## Wyszukiwarka

![Wyszukiwarka](img/wyszukiwarka.png)

Otwierasz ją polem w górnym pasku, skrótem `⌘K` albo klawiszem `/`.

- Bez wpisanego tekstu pokazuje ostatnio otwierane rekordy, zadania na dziś, nawigację i szybkie tworzenie.
- Szuka w nazwach, firmach, osobach, emailach, telefonach, domenach, następnych krokach i historii notatek.
- Na górze jest najlepsze dopasowanie, niżej wyniki pogrupowane według obiektu, z podświetleniem trafienia, etapem lub statusem i kwotą.
- `↑` `↓` zmieniają wybór, `↵` otwiera, `Tab` przełącza zakres (Leady, Szanse, Firmy, Kontakty, Historia).
- „Pokaż wszystkie” rozwija grupę, a „Otwórz listę” przenosi wyszukiwanie na listę obiektu.
- Bez wyników proponuje utworzenie leada, firmy albo kontaktu z wpisaną nazwą.

## Analityka

![Analityka](img/analityka.png)

**Okresy:** dzień, tydzień, miesiąc, kwartał, rok. Strzałkami przechodzisz do poprzednich okresów, a „Bieżący” wraca do dziś. Każdy wynik jest porównany z poprzednim okresem.

**Cel okresu** wynika z celu miesięcznego: kwartał to trzy razy więcej, rok dwanaście, dzień i tydzień proporcjonalnie do liczby dni w miesiącu. W bieżącym okresie Hermes pokazuje tempo: czy wygrane nadążają za upływem czasu.

**Moduły:** wskaźniki sprzedaży, aktywność handlowa, wygrane i prognoza, pokrycie celu, zdrowie lejka (stan na dziś), zespół, jakość źródeł leadów, powody przegranych. Do dodania: lejek konwersji, najbliższe zamknięcia, leady według statusu.

![Tryb układu](img/analityka-uklad.png)

**„Dostosuj układ”** włącza tryb edycji: przeciągasz moduły, zmieniasz szerokość (⅓, ½, ⅔, całość), usuwasz je i dodajesz. Siatka sama wypełnia luki i dopasowuje się do szerokości ekranu. „Przywróć domyślny” wraca do startowego układu.

## Kalendarz i umawianie spotkań

![Kalendarz](img/kalendarz.png)

Strona **Kalendarz** zbiera spotkania z klientami: nadchodzące według dni i te, które minęły, a czekają na podsumowanie. Spotkania na dziś widać też nad listą „Na dziś” na Pulpicie.

**Link do umawiania.** Klient otwiera Twój link, wybiera wolny dzień i godzinę, podaje imię, email i firmę, a Hermes sam:

- znajduje kontakt po adresie email albo go zakłada, razem z firmą;
- zapisuje spotkanie przy otwartej szansie tej osoby, a gdy jej nie ma, przy leadzie; bez obu zakłada nowego leada ze źródłem „Kalendarz”;
- ustawia następny krok na dzień spotkania;
- wysyła Tobie i klientowi potwierdzenie z zaproszeniem do kalendarza (Google, Outlook, Apple).

Klient może odwołać spotkanie z maila. Wtedy następnym krokiem staje się „Ustalić nowy termin spotkania”. Link wyślesz szablonem „Wybór terminu” albo przyciskiem „Wyślij klientowi”. Bez serwera link nie działa, ale „Podgląd strony dla klienta” pozwala przetestować rezerwację.

**Dostępność** ustawiasz przyciskiem „Dostępność”: nazwę i czas spotkania, dni, godziny, przerwę po spotkaniu, minimalne wyprzedzenie, ile dni naprzód i miejsce lub link do rozmowy. Hermes pokazuje tylko terminy, w których nie masz innego spotkania w CRM.

**Umów spotkanie sam.** Przycisk „Umów” na karcie szansy, leada, firmy lub kontaktu otwiera okno z wolnymi terminami. Wybierasz osobę, temat, czas i godzinę (albo wpisujesz dowolną), a potem wysyłasz zaproszenie mailem z plikiem `.ics`.

**Po spotkaniu** kliknij „Odbyło się”: wpis zamienia się w spotkanie w historii, liczy się jako kontakt w analityce, a Hermes od razu pyta o kolejny krok. „Odwołaj” i krzyżyk „Nie odbyło się” zostawiają ślad w historii.

## Zespół i przegląd lejka

Zakładka **Zespół** pojawia się, gdy w firmie są co najmniej dwie osoby. To widok managera na spotkanie zespołu:

- **Prognoza miesiąca:** cel, wygrane, szanse „Pewne” i „Możliwe” z terminem w tym miesiącu oraz luka do celu. Kategorię prognozy (Lejek, Możliwe, Pewne) handlowiec ustawia na karcie szansy.
- **Lejek na osobę:** otwarte szanse, pewne w miesiącu, wygrane wobec celu, kroki po terminie, rekordy bez kroku, szanse stojące ponad 14 dni i zamknięcia w ciągu 14 dni. Kliknięcie osoby pokazuje szanse, które wymagają uwagi.
- **Aktywność w tym tygodniu:** telefony, maile i spotkania każdej osoby wobec celu tygodniowego, który ustawisz tutaj.
- **Raport CSV** do pobrania.

**Przegląd lejka** to cotygodniowy nawyk na 10 minut. Hermes pokazuje po kolei szanse, które wymagają decyzji: bez kroku, po terminie, stojące za długo w etapie albo z minionym terminem zamknięcia. Przy każdej ustalasz krok, zmieniasz etap, zamykasz ją albo pomijasz. Przycisk jest na stronie Lejek, w Zespole, a na liście „Na dziś” przypomina się, gdy od ostatniego przeglądu minął tydzień.

## Hermes AI

Przycisk **„Ask Hermes AI”** (`⌘J`) otwiera panel rozmowy. Na karcie rekordu AI dostaje jego kontekst.

Bez klucza Hermes AI działa lokalnie i rozumie pytania o plan dnia, zagrożone szanse, wyniki miesiąca, kolejność leadów, podsumowania rekordów, następne kroki i szkice maili. Z kluczem Claude API odpowiada na dowolne pytania o dane w CRM. Szczegóły w [Hermes AI](hermes-ai.md).

## Ustawienia

| Zakładka | Co tam jest |
| --- | --- |
| Ogólne | Profil, cel miesięczny, klucz Claude API i model, kopia zapasowa, eksport CSV, dane demo, czyszczenie danych |
| Zespół | Profile handlowców: imię, email, rola, cel indywidualny, otwarty lejek |
| Lejek | Etapy szans: nazwa, prawdopodobieństwo, podpowiedź kroku, kolejność, dodawanie i usuwanie |
| Szablony | Szablony wiadomości z polami {imie}, {pan_pani}, {firma}, {szansa}, {krok}, {podpis}; dodawanie, usuwanie i przywracanie domyślnych |
| Zaawansowane | Automatyzacje, produkty i oferty oraz pola leadów, szans, firm i kontaktów (zmiana nazw i własne pola) |

![Edycja etapów](img/ustawienia-etapy.png)

- Zmiana nazwy etapu przenosi wszystkie szanse razem z nią.
- Usunięcie etapu przenosi jego szanse do sąsiedniego etapu i można je cofnąć.
- Etapy „Wygrana” i „Przegrana” są stałe.
- Zmiana imienia handlowca przenosi się na wszystkie jego rekordy.
- Usunięcie profilu przekazuje jego rekordy właścicielowi konta.

## Produkty i oferty

Na karcie szansy panel **Produkty i oferta** zbiera pozycje: z katalogu (Ustawienia, Produkty) albo własne. Każda ma ilość, cenę netto, rabat w procentach i stawkę VAT (23, 8, 5, 0 albo zwolnienie). Wartość szansy liczy się sama z sumy netto, więc prognoza i analityka zawsze zgadzają się z ofertą.

- **Podgląd i PDF** pokazuje ofertę z danymi sprzedawcy z Ustawień; z okna drukujesz ją albo zapisujesz jako PDF.
- **Utwórz ofertę z linkiem** (z serwerem) nadaje numer, np. `OF/2026/10/001`, i kopiuje link do strony oferty dla klienta. Klient widzi ofertę na telefonie i komputerze, może ją wydrukować i zaakceptować, wpisując imię i nazwisko.
- Otwarcie oferty przez klienta i jej akceptacja trafiają do historii szansy, a autor oferty dostaje maila. Status każdej oferty widać pod pozycjami.

## Automatyzacje

W Ustawieniach, w zakładce **Automatyzacje**, ustawisz reguły „kiedy, wtedy”. Gotowe szablony dodasz jednym kliknięciem: faktura i umowa po wygranej, follow up 3 dni po wejściu w etap Oferta, powrót do przegranego klienta po 90 dniach, przydział nowych leadów po kolei.

| Kiedy | Wtedy |
| --- | --- |
| Szansa wchodzi w wybrany etap | Zadanie z terminem za wybraną liczbę dni |
| Szansa wygrana albo przegrana | Zadanie z terminem |
| Nowy lead (z dowolnego albo wybranego źródła) | Zadanie albo przypisanie opiekuna: wybranej osoby lub po kolei, do osoby z najmniejszą liczbą otwartych leadów |

Zadanie dostaje opiekun rekordu. Każde zadziałanie reguły jest wpisane w historii. Na serwerze reguły dla nowych leadów działają też dla zgłoszeń z formularza na stronie.

## Masowe akcje, widoki i duplikaty

- **Masowe akcje:** zaznacz wiersze na liście (albo wszystkie widoczne pierwszym polem w nagłówku). Pasek nad tabelą pozwala zmienić opiekuna, etap szans albo status leadów i usunąć zaznaczone. Każdą zmianę cofniesz z powiadomienia.
- **Zapisane widoki:** ikona flagi w pasku listy zapisuje filtr, opiekuna, wyszukiwanie i sortowanie pod nazwą. Widoki są osobne dla każdej osoby i pojawiają się nad tabelą.
- **Duplikaty:** na liście firm i kontaktów przycisk **Duplikaty** pokazuje rekordy o tej samej nazwie (dla firm bez formy prawnej, np. „Sp. z o.o.”) albo tym samym emailu. Scalenie zostawia najstarszy rekord, uzupełnia w nim puste pola, przenosi powiązania i historię.

## Cofanie i bezpieczeństwo danych

Usunięcie rekordu, odłączenie kontaktu lub firmy, odrzucenie leada, usunięcie etapu, profilu lub modułu, wczytanie danych demo i wyczyszczenie danych cofniesz z powiadomienia na dole ekranu (przez około 7 sekund). Zmianę etapu lub statusu cofasz w oknie następnego kroku.

Dane zapisują się automatycznie w tej przeglądarce. Wyczyszczenie danych przeglądarki je usuwa, dlatego regularnie pobieraj **kopię zapasową** w Ustawieniach.
