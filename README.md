# Hermes CRM

Hermes to prosty, minimalistyczny CRM dla małych i średnich firm, zaprojektowany dla foundera, który sam sprzedaje. To klikalny prototyp w jednym pliku HTML: nie trzeba niczego instalować ani uruchamiać serwera.

## Uruchomienie

Otwórz `index.html` w przeglądarce, najlepiej na komputerze, w pełnym oknie.

Hermes startuje **pusty**. Na Pulpicie czeka lista „Zacznij tutaj”:

1. uzupełnij profil (imię i nazwa firmy),
2. ustaw miesięczny cel sprzedaży,
3. wgraj firmy i kontakty,
4. dodaj pierwszego leada,
5. opcjonalnie podłącz Hermes AI.

Chcesz najpierw zobaczyć Hermesa w akcji? Kliknij „Wczytaj dane demo”. Usuniesz je przyciskiem „Wyczyść wszystko” w **Ustawieniach → Ogólne**.

Dane zapisują się automatycznie w tej przeglądarce. W Ustawieniach pobierzesz **kopię zapasową** (plik JSON) i wczytasz ją na innym komputerze. Dane ze starszej wersji (v2) przenoszą się same.

## Leady i szanse sprzedaży

- **Lead** to każdy potencjalny klient: zapytanie ze strony, polecenie albo kontakt z targów. Ma swoje statusy: Nowy → W kontakcie → Kwalifikacja, ocenę dopasowania do ICP, źródło i szacowaną wartość.
- **Szansa sprzedaży** to klient, z którym jesteś już w procesie sprzedaży, bo pasuje do ICP i jest zainteresowany. Jej etapy to Nowe → Kontakt → Oferta → Negocjacje → Wygrana albo Przegrana.
- **Konwersja.** Kliknięcie „Konwertuj na szansę” otwiera checklistę („pasuje do ICP”, „jest zainteresowany”). Potem podajesz wartość, etap startowy i następny krok. Szansa przejmuje firmę, wszystkie kontakty i historię leada.
- **Odrzucenie.** Lead, który nie rokuje, odrzucasz z podaniem powodu. Możesz to cofnąć albo później przywrócić leada.

## Karta leada i szansy

Kliknięcie leada lub szansy w dowolnym miejscu otwiera pełny ekran rekordu, podobny do kart w HubSpocie czy Pipedrive:

- **Nagłówek** z edytowalną nazwą i akcjami: Wygrana/Przegrana albo Konwertuj/Odrzuć, Zapytaj AI, Usuń.
- **Klikalny pasek etapów lub statusów.** Pokazuje też liczbę dni w etapie i prawdopodobieństwo.
- **Kluczowe liczby**: wartość, prognoza ważona, planowane zamknięcie, ostatni kontakt, wiek leada.
- **Powiązania.** Do rekordu dodajesz firmę i **dowolną liczbę kontaktów**. Wyszukiwarka pozwala też utworzyć nową osobę lub firmę w locie. Hermes podpowiada pozostałe osoby z tej samej firmy. Możesz ustawić kontakt główny i odłączyć kontakt z opcją cofnięcia. Po powiązaniu kontaktu Hermes sam uzupełnia firmę.
- **Aktywności.** Dodajesz notatkę, telefon (z wynikiem rozmowy, np. „Nie odebrał(a)”), e-mail lub spotkanie i wskazujesz, z kim rozmawiałeś.
- **Oś czasu** jest pogrupowana według dni i ma filtry. Na górze widać zaplanowany krok, a pod nim wpisy z rekordu, z jego kontaktów i ze źródłowego leada.

Firmy i kontakty otwierają się w panelu bocznym. Widać w nim powiązane leady i szanse, a jednym kliknięciem założysz nowego leada lub szansę dla tej osoby albo firmy.

## Jak pracować z Hermesem

1. Każdy otwarty lead i każda otwarta szansa ma **następny krok z terminem**.
2. Rano otwierasz **Pulpit**. Lista „Na dziś” zbiera kroki na dziś, kroki po terminie, rekordy bez planu i leady czekające na pierwszy kontakt.
3. **Zamknięcie zadania wymusza kolejny krok.** Po kliknięciu „Zrobione” zaplanuj kolejny krok albo zamknij rekord: szansę jako wygraną lub przegraną, leada przez konwersję lub odrzucenie. Krok możesz też **świadomie pominąć krzyżykiem ✕**. Rekord trafi wtedy na listę „bez planu”, a w historii zostanie ślad. Ta sama zasada działa przy zmianie etapu lub statusu (zmianę można cofnąć).
4. Po rozmowie zapisujesz krótki wpis w historii i od razu zamykasz lub planujesz krok z powiadomienia. Pierwsza rozmowa z nowym leadem sama zmienia jego status na „W kontakcie”.
5. Przegrana szansa i odrzucony lead wymagają **powodu**. Po kilku tygodniach Analityka pokaże, co blokuje sprzedaż.

## Co jest w środku

- **Pulpit**: wartość lejka, prognoza ważona, otwarte leady, lista „Na dziś” i największe szanse.
- **Lejek**: kanban z przeciąganiem, prawdopodobieństwem etapu i oznaczeniem szans stojących 14+ dni.
- **Listy**:
  - filtry: otwarte, skonwertowane, odrzucone, wygrane, przegrane, cisza 30+ dni;
  - sortowanie po kliknięciu w nagłówek kolumny;
  - kolumny „Kontakty” i „Następny krok”;
  - flaga czasu reakcji na nowe leady.
- **Dodawanie ręczne**: lead lub szansa razem z firmą i osobą w jednym formularzu. Istniejące rekordy podpowiadają się z listy, a duplikaty są wykrywane.
- **Import i eksport CSV**: automatyczne dopasowanie kolumn, także osoby kontaktowej (imię, e-mail, telefon) przy leadach i szansach. Firmy i osoby są tworzone albo dopasowywane do istniejących.
- **Cofnij**: usunięcie rekordu, odłączenie kontaktu, odrzucenie leada, dane demo i czyszczenie danych.
- **Analityka** z wyborem okresu: **dzień, tydzień, miesiąc, kwartał, rok**. Strzałkami przechodzisz do poprzednich okresów, każdy wynik porównany jest z poprzednim okresem. W raporcie:
  - wygrane względem celu okresu (cel miesięczny ×3 dla kwartału, ×12 dla roku, proporcjonalnie dla dnia i tygodnia) oraz tempo względem upływu okresu;
  - nowe szanse, skuteczność i konwersja leadów w okresie;
  - aktywność: telefony, e-maile, spotkania, zamknięte zadania, nowe leady;
  - wykres „Wygrane i prognoza” (wygrane w kolejnych okresach plus planowane zamknięcia) i pokrycie celu;
  - zdrowie lejka, wyniki zespołu, jakość źródeł leadów i powody przegranych.
- **Hermes AI** (⌘J): plan dnia, zagrożone szanse (także te z jedną osobą po stronie klienta), kolejność leadów (najpierw ICP, potem źródło), podsumowania rekordów, rada „konwertować czy nie”, szkice wiadomości i propozycje kroków. Bez klucza działa lokalnie. Z kluczem Claude API odpowiada na dowolne pytania.
- **⌘K**: wyszukiwarka z ostatnio otwieranymi rekordami i zadaniami na dziś.
- **Ustawienia**: profil, cel, Hermes AI, kopia zapasowa, eksport CSV, dane demo i pola obiektów (zmiana nazw, własne pola).

## Skróty klawiszowe

| Skrót | Akcja |
| --- | --- |
| `⌘K` / `Ctrl+K` | Wyszukiwarka |
| `⌘J` / `Ctrl+J` | Ask Hermes AI |
| `N` | Nowy rekord (lead na Pulpicie, szansa w Lejku) |
| `⌘↵` / `Ctrl+Enter` | Zapisz wpis w historii |
| `Esc` | Zamknij okno lub panel; na karcie rekordu wróć do listy |

## Technologia

Całość to jeden plik `index.html` z HTML, CSS i czystym JavaScriptem, bez zależności. Dane trzymane są w `localStorage` przeglądarki (klucz `hermes-crm-v3`, z migracją z v2). Fonty Space Grotesk i DM Sans pochodzą z Google Fonts.

Hermes AI w trybie z kluczem łączy się z API Anthropic bezpośrednio z przeglądarki. To rozwiązanie tylko na prototyp: w wersji produkcyjnej zapytania muszą iść przez serwer, a klucz nie może trafiać do przeglądarki.

## Co dalej

Planowane:

- zadania i przypomnienia niezależne od kroków,
- edytowalne etapy lejka,
- zapisane widoki,
- poranny e-mail z planem dnia,
- integracja z Gmailem i kalendarzem (automatyczne logowanie maili i spotkań),
- formularz leadów na stronę,
- aplikacja z bazą danych i kontami użytkowników.
