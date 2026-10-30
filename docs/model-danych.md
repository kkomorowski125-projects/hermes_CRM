# Model danych

Hermes ma cztery obiekty biznesowe (firma, kontakt, lead, szansa) i dziennik aktywności. Wszystko żyje w obiekcie `db` i zapisuje się w `localStorage` przeglądarki.

## Relacje

```
Firma 1 ── n Kontakt            kontakt.company → firma.id
Firma 1 ── n Lead               lead.company → firma.id
Firma 1 ── n Szansa             szansa.company → firma.id
Lead  n ── n Kontakt            lead.contacts[] → kontakt.id (pierwszy = główny)
Szansa n ── n Kontakt           szansa.contacts[] → kontakt.id (pierwszy = główny)
Lead  1 ── 0..1 Szansa          lead.dealId ↔ szansa.leadId (po konwersji)
Rekord 1 ── n Aktywność         aktywnosc.obj + aktywnosc.rid
```

## Firma (`company`)

| Pole | Typ | Opis |
| --- | --- | --- |
| `id` | tekst | Identyfikator, np. `c1` |
| `name` | tekst, wymagane | Nazwa firmy |
| `domain` | tekst | Strona www |
| `industry` | tekst | Branża |
| `city` | tekst | Miasto |
| `employees` | liczba | Liczba pracowników |
| `nip` | tekst | NIP |
| `created` | data | Data dodania |

## Kontakt (`contact`)

| Pole | Typ | Opis |
| --- | --- | --- |
| `id` | tekst | Identyfikator, np. `p1` |
| `name` | tekst, wymagane | Imię i nazwisko |
| `email` | email | Adres email |
| `phone` | telefon | Numer telefonu |
| `company` | powiązanie z firmą | Firma, w której pracuje |
| `role` | tekst | Stanowisko |
| `created` | data | Data dodania |

## Lead (`lead`)

| Pole | Typ | Opis |
| --- | --- | --- |
| `id` | tekst | Identyfikator, np. `l1` |
| `name` | tekst, wymagane | Nazwa leada, zwykle nazwa firmy |
| `company` | powiązanie z firmą | Firma |
| `contacts` | lista identyfikatorów kontaktów | Osoby, pierwsza jest główna |
| `status` | lista | Nowy, W kontakcie, Kwalifikacja, Skonwertowany, Odrzucony |
| `statusAt` | data | Data ostatniej zmiany statusu |
| `icp` | lista | Pasuje, Do sprawdzenia, Nie pasuje |
| `source` | lista | Strona www, Polecenie, Targi, Cold mailing, LinkedIn, Inne |
| `value` | kwota | Szacowana wartość |
| `nextStep`, `nextDate` | tekst, data | Następny krok i jego termin |
| `owner` | lista | Opiekun (profil handlowca) |
| `disqReason` | lista | Powód odrzucenia, gdy status = Odrzucony |
| `dealId`, `convertedAt` | tekst, data | Szansa utworzona z leada i data konwersji |
| `created` | data | Data dodania |

Otwarte leady to te ze statusem Nowy, W kontakcie albo Kwalifikacja.

## Szansa (`deal`)

| Pole | Typ | Opis |
| --- | --- | --- |
| `id` | tekst | Identyfikator, np. `d1` |
| `name` | tekst, wymagane | Nazwa szansy |
| `company` | powiązanie z firmą | Firma |
| `contacts` | lista identyfikatorów kontaktów | Osoby, pierwsza jest główna |
| `value` | kwota | Wartość w zł |
| `stage` | lista | Etap z ustawień lejka albo Wygrana, Przegrana |
| `stageAt` | data | Data wejścia do bieżącego etapu |
| `prevStage` | tekst | Etap przed zamknięciem (do ponownego otwarcia) |
| `nextStep`, `nextDate` | tekst, data | Następny krok i jego termin |
| `close` | data | Planowane zamknięcie |
| `closedAt` | data | Data wygranej lub przegranej |
| `owner` | lista | Opiekun |
| `lostReason` | lista | Powód przegranej |
| `leadId` | tekst | Lead, z którego powstała szansa |
| `created` | data | Data dodania |

**Prognoza ważona** = wartość × prawdopodobieństwo etapu. Domyślnie Nowe 10%, Kontakt 25%, Oferta 50%, Negocjacje 75%. Prawdopodobieństwa zmieniasz w ustawieniach lejka.

## Aktywność (`activity`)

| Pole | Typ | Opis |
| --- | --- | --- |
| `id` | tekst | Identyfikator |
| `obj`, `rid` | tekst | Obiekt i identyfikator rekordu, którego dotyczy wpis |
| `type` | tekst | `note`, `call`, `email`, `meeting`, `task` (zamknięty krok), `stage` (zmiana etapu lub statusu), `system` |
| `text` | tekst | Treść |
| `at` | data i godzina | `RRRR-MM-DDTGG:MM` |
| `outcome` | tekst | Wynik rozmowy, np. „Nie odebrał(a)” |
| `who` | tekst | Kontakt, z którym była rozmowa |

Historia rekordu zbiera wpisy z rekordów powiązanych: firma widzi wpisy swoich kontaktów, leadów i szans; szansa widzi wpisy swoich kontaktów i źródłowego leada. Ostatni kontakt liczy się z notatek, telefonów, emaili i spotkań.

## Pola własne

W Ustawieniach możesz dodać do każdego obiektu pola typu tekst, liczba, kwota, data, lista wyboru, email i telefon. Pole własne ma klucz `cf…` i zapisuje się w rekordzie jak pola wbudowane. Pola wbudowane (`core`) można tylko przemianować.

## Ustawienia (`settings`)

| Klucz | Opis |
| --- | --- |
| `userName`, `company` | Profil właściciela konta i nazwa firmy |
| `userEmail`, `userRole`, `meTarget` | Dane profilu właściciela w zespole |
| `target`, `targetSet` | Cel sprzedaży na miesiąc w zł |
| `team` | Profile handlowców: `{ id, name, email, role, target }` |
| `stages` | Etapy otwarte: `{ name, prob, hint, color }` |
| `aLayout` | Układ modułów analityki: `{ id, w }`, szerokość 4, 6, 8 lub 12 kolumn |
| `onboardingHidden` | Czy ukryto listę „Zacznij tutaj” |

## Zapis na serwerze

W trybie serwera każdy rekord jest wierszem tabeli `records`: identyfikator firmy, typ (`company`, `contact`, `lead`, `deal`, `activity`), identyfikator, dane w JSON w tym samym kształcie co w przeglądarce, opiekun (dla leadów i szans), czas i autor zmiany oraz znacznik usunięcia. Ustawienia firmy (cel, etapy, nazwy pól, pola własne) są w tabeli `orgs`, a preferencje osoby (układ Analityki) w `users.prefs`. Pozostałe tabele: `users`, `memberships`, `sessions`, `invites`, `password_resets`, `audit_log`, `ai_usage` ([serwer](serwer.md)).

## Zapis w przeglądarce

| Klucz `localStorage` | Zawartość |
| --- | --- |
| `hermes-crm-v3` | Bieżące dane: `db`, `settings`, nazwy pól i pola własne |
| `hermes-crm-v2` | Dane starszej wersji, czytane tylko przy pierwszym uruchomieniu |
| `hermes-ai-config` | Klucz Claude API i model; nie trafia do kopii zapasowej |

Kopia zapasowa (JSON) ma kształt:

```json
{
  "app": "hermes-crm",
  "v": 3,
  "savedAt": "2026-10-30T21:00",
  "db": { "company": [], "contact": [], "lead": [], "deal": [], "activity": [] },
  "settings": { "target": 100000, "stages": [], "team": [] },
  "labels": { "lead": { "name": "Nazwa leada" } },
  "custom": { "lead": [] }
}
```

## Migracja z wersji 2

`migrateDb()` uruchamia się przy każdym wczytaniu danych i jest bezpieczna przy wielokrotnym wywołaniu:

- `deal.contact` (jeden kontakt) zamienia się w `deal.contacts` (lista);
- stary lead z polami `companyName`, `email`, `phone` dostaje powiązaną firmę i kontakt, a jego nazwa staje się nazwą firmy;
- status „Zakwalifikowany” zamienia się w „Skonwertowany”.
