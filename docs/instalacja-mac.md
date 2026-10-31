# Instalacja na Macu

Hermes CRM można zainstalować na jednym Macu jak zwykłą aplikację: z kontami, synchronizacją, kalendarzem i wszystkimi funkcjami serwera, a dane zostają tylko na tym komputerze.

## Instalacja

1. Pobierz `Hermes-CRM-<wersja>-macOS.zip` i rozpakuj go.
2. Otwórz Terminal, wpisz `bash` i spację, przeciągnij do okna plik `Zainstaluj Hermes CRM.command` i naciśnij Enter.
3. CRM otworzy się w przeglądarce. Pierwsze konto zakłada firmę i jest kontem administratora.

Wymagania: macOS 11 lub nowszy, Apple Silicon albo Intel, internet przy instalacji (pobranie Node.js, około 50 MB).

## Co robi instalator

| Krok | Szczegóły |
| --- | --- |
| Node.js | Pobiera najnowsze Node.js 22 z nodejs.org dla procesora Maca i sprawdza sumę SHA 256; bez dostępu do sieci używa Node.js z systemu, jeśli ma wersję 22.13 lub nowszą |
| Aplikacja | `~/Applications/Hermes CRM.app` z serwerem spakowanym w jeden plik, frontendem i własnym Node.js w środku |
| Dane | `~/Library/Application Support/Hermes CRM`: baza `hermes.db`, plik `ustawienia.env`, log `hermes.log` |
| Usługa | LaunchAgent `pl.hermes.crm`: start po zalogowaniu, restart po awarii, nasłuch tylko na `127.0.0.1` |
| Port | 3210 albo pierwszy wolny do 3240 |

Ikona „Hermes CRM” uruchamia usługę, jeśli nie działa, i otwiera CRM w przeglądarce.

## Ustawienia

Plik `ustawienia.env` zawiera port, adres, klucz Claude API (Hermes AI na serwerze) i wysyłkę maili (`SMTP_URL`, `MAIL_FROM`), bez której nie wyjdą zaproszenia ani potwierdzenia spotkań. Po zmianie kliknij ikonę Hermes CRM. Żeby otworzyć CRM z innych urządzeń w sieci, zmień `HOST` na `0.0.0.0`, a `PUBLIC_URL` na adres Maca w sieci.

## Aktualizacja i odinstalowanie

Nowszy instalator aktualizuje aplikację, zachowuje dane i przed uruchomieniem migracji zapisuje spójną kopię bazy `hermes-przed-aktualizacja.db`. `Odinstaluj Hermes CRM.command` usuwa aplikację i usługę; dane usuwa tylko po wpisaniu TAK.

## Budowanie instalatora

```bash
bash tools/build-installer.sh      # dist/Hermes-CRM-<wersja>-macOS.zip
```

Skrypt pakuje serwer esbuild do jednego pliku `hermes.mjs` (bez `node_modules`), dodaje `index.html`, ikony, skrypty z `installer/macos` i instrukcję `Przeczytaj.txt`.
