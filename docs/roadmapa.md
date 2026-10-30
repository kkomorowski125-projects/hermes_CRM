# Roadmapa produktu

W 18 miesięcy zamieniamy klikalny prototyp Hermesa w płatny CRM dla 300 polskich firm MŚP, w których sprzedaje founder albo mały zespół.

**Obietnica sprzedażowa:** CRM, do którego nic nie wpisujesz. Maile, kalendarz i głos zapisują się same, a Hermes pilnuje, żeby każdy klient miał następny krok.

**Założenia planu:** founder jako właściciel produktu, 2 do 3 programistów, projektant na pół etatu od fazy 2. Stan na 30 października 2026.

**Postęp fazy 1 (wersja 0.10):** gotowe są backend z bazą, konta z 2FA i resetem hasła, zespoły z rolami i widocznością, AI na serwerze z limitami, dziennik zmian, eksport i usunięcie danych osoby, testy, CI i Docker. Zostały logowanie Google i Microsoft, wysyłka maili, wdrożenie w UE z kopiami i monitoringiem oraz program pilotażowy.

## Fazy i bramki

| Faza | Okres | Zakres | Bramka wyjścia |
| --- | --- | --- | --- |
| 1. Fundament | listopad 2026 do stycznia 2027 | Serwer, konta, zespoły, bezpieczeństwo i RODO | 10 pilotów aktywnych co tydzień przez 4 tygodnie, zero utraconych danych |
| 2. Płatna beta | luty do kwietnia 2027 | Poczta, kalendarz, zadania, płatności, importy, wersja mobilna | 30 płacących firm, 6 z 10 pilotów płaci, ponad połowa aktywności zapisuje się automatycznie |
| 3. Wzrost | maj do września 2027 | Oferty, automatyzacje, sekwencje, integracje | 150 płacących firm, odejścia poniżej 3% miesięcznie, 3 użytkowników na firmę |
| 4. Skala | październik 2027 do marca 2028 | Telefonia z AI, API, aplikacja natywna, plan Business | 300 płacących firm, 20 na planie Business |

Gdy bramki nie osiągamy, zostajemy w fazie i poprawiamy produkt zamiast dokładać funkcje.

## Jak ustalamy priorytety

- **P0, warunek sprzedaży:** bez tego firma nie może bezpiecznie powierzyć nam danych albo zapłacić.
- **P1, powód zakupu:** realizuje obietnicę „nic nie wpisujesz” albo usuwa najczęstszy powód odrzucenia.
- **P2, wzrost i retencja:** zwiększa wartość konta, liczbę użytkowników w firmie lub cenę.
- **P3, skala:** potrzebne większym klientom albo partnerom, nie pierwszym 100 firmom.

Wewnątrz poziomu decyduje wpływ (1 do 5) do nakładu (tygodnie pracy jednego programisty). Oceny weryfikujemy co miesiąc.

## Faza 1: fundament komercyjny

| Inicjatywa | Priorytet | Nakład | Zakres |
| --- | --- | --- | --- |
| Backend i baza danych | P0 | 6 tyg. | Serwer z API i bazą danych, model z prototypu, import kopii JSON |
| Konta i logowanie | P0 | 2 tyg. | Email i hasło, Google, Microsoft, 2FA, reset hasła |
| Zespoły i uprawnienia | P0 | 3 tyg. | Zaproszenia, role admin, handlowiec i podgląd, widoczność rekordów |
| Bezpieczeństwo i RODO | P0 | 3 tyg. | Serwery w UE, szyfrowanie, kopie, log zmian, eksport i usunięcie danych osoby, umowa powierzenia |
| Hermes AI na serwerze | P0 | 1,5 tyg. | Klucz API po stronie serwera, limity zużycia na firmę |
| Jakość i monitoring | P0 | 2 tyg. | Testy, CI, środowisko testowe, monitoring błędów |
| Program pilotażowy | P0 | founder | 10 firm bez opłat, rozmowa co tydzień |

## Faza 2: płatna beta

| Inicjatywa | Priorytet | Nakład | Zakres |
| --- | --- | --- | --- |
| Płatności i plany | P0 | 3 tyg. | 14 dni próby, karta i BLIK, faktury VAT, zmiana planu |
| Gmail i Kalendarz Google | P1 | 5 tyg. | Dwukierunkowa synchronizacja, maile i spotkania same w historii |
| Outlook i Microsoft 365 | P1 | 4 tyg. | To samo dla poczty i kalendarza Microsoft |
| Zadania i przypomnienia | P1 | 3 tyg. | Wiele zadań na rekord, przypisanie, powiadomienia, poranny plan dnia |
| Dane firmy po NIP | P1 | 1 tyg. | Nazwa, adres i branża z rejestru REGON |
| Importy od konkurencji | P1 | 3 tyg. | Pipedrive, HubSpot, Livespace, lepszy import CSV |
| Formularz leada na stronę | P1 | 1,5 tyg. | Wklejany formularz i webhook |
| Wersja mobilna | P1 | 3 tyg. | Pełna wersja na telefon (PWA) z głosem i listą „Na dziś” |
| Onboarding i pomoc | P1 | 2 tyg. | Przewodnik w produkcie, maile powitalne, baza wiedzy, czat |

**Hipoteza ceny:** 69 zł netto za użytkownika miesięcznie, do sprawdzenia z pilotami.

## Faza 3: wzrost

| Inicjatywa | Priorytet | Nakład | Zakres |
| --- | --- | --- | --- |
| Produkty i oferty | P2 | 4 tyg. | Katalog, pozycje w szansie, rabaty i VAT, oferta PDF z akceptacją online |
| Automatyzacje | P2 | 4 tyg. | Reguły na zmianę etapu, przydział leadów |
| Sekwencje emailowe | P2 | 4 tyg. | Szablony, kolejne wiadomości, zatrzymanie po odpowiedzi |
| Masowe akcje i widoki | P2 | 3 tyg. | Zmiany dla wielu rekordów, zapisane widoki, scalanie duplikatów |
| Integracje fakturowe | P2 | 2 tyg. | Fakturownia, inFakt, wFirma |
| Zapier, Make i webhooki | P2 | 2 tyg. | Zdarzenia i akcje dla narzędzi no code |
| Raporty zespołu | P2 | 2 tyg. | Cele per handlowiec, eksport raportów, poranny email |
| Program poleceń | P2 | 1 tyg. | Link polecający, miesiąc gratis dla obu stron |

## Faza 4: skala

| Inicjatywa | Priorytet | Nakład | Zakres |
| --- | --- | --- | --- |
| Telefonia z AI | P3 | 6 tyg. | Klik do dzwonienia, nagranie, transkrypcja i podsumowanie |
| Kilka lejków i własne obiekty | P3 | 5 tyg. | Osobne lejki, własne obiekty i relacje |
| Publiczne API | P3 | 4 tyg. | Dokumentowane API z kluczami i limitami |
| Natywna aplikacja mobilna | P3 | 8 tyg. | iOS i Android, powiadomienia, praca bez internetu |
| Plan Business | P3 | 4 tyg. | SSO, rozszerzone role, dziennik audytu, SLA |
| Wersja angielska | P3 | 3 tyg. | Tłumaczenie interfejsu i AI, waluty, formaty dat |

## Metryki sukcesu

| Faza | Metryka główna | Metryki kontrolne |
| --- | --- | --- |
| 1. Fundament | 7 z 10 pilotów aktywnych co tydzień | Zero utraconych danych, odpowiedź poniżej 300 ms |
| 2. Płatna beta | 30 płacących firm | Ponad 50% aktywności zapisane automatycznie, 60% konwersji pilotów |
| 3. Wzrost | 150 płacących firm | Odejścia poniżej 3% miesięcznie, 3 użytkowników na firmę |
| 4. Skala | 300 płacących firm | 20 firm na planie Business, 30% nowych klientów z poleceń |

Na co dzień śledzimy też odsetek otwartych szans z następnym krokiem.

## Ryzyka i plan awaryjny

- **Weryfikacja dostępu do Gmaila trwa tygodniami.** Wniosek składamy w fazie 1; do czasu akceptacji działa przekazywanie maili na adres w Hermesie (BCC).
- **Koszty AI rosną szybciej niż przychody.** Limity na firmę, tańszy model do prostych zadań, AI w wyższym planie.
- **Mały zespół, dużo integracji.** Każda integracja ma właściciela i testy; kolejną zaczynamy, gdy poprzednia jest stabilna.
- **Klienci nie chcą migrować danych.** Importy od konkurencji w fazie 2 i darmowa migracja dla pierwszych 50 firm.
- **Rozpoznawanie mowy zależy od przeglądarki.** W fazie 2 przenosimy je na serwer.

**Zależności:** synchronizacja poczty, płatności i wersja mobilna wymagają backendu i kont z fazy 1. Automatyzacje i sekwencje wymagają zadań i synchronizacji poczty z fazy 2.

**Świadomie nie robimy przed 300 firmami:** marketing automation, helpdesk, własnego modułu fakturowania, wdrożeń na serwerach klienta.
