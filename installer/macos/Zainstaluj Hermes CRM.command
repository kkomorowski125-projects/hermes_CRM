#!/bin/bash
# Instalator Hermes CRM dla macOS (Apple Silicon i Intel).
# Instaluje aplikację „Hermes CRM” w ~/Applications, prywatne środowisko Node.js w jej wnętrzu,
# dane w ~/Library/Application Support/Hermes CRM i usługę, która uruchamia CRM w tle po zalogowaniu.
# Ponowne uruchomienie aktualizuje aplikację i zachowuje dane.
set -euo pipefail

VERSION="__VERSION__"
LABEL="pl.hermes.crm"
APP="$HOME/Applications/Hermes CRM.app"
DATA="$HOME/Library/Application Support/Hermes CRM"
AGENT="$HOME/Library/LaunchAgents/$LABEL.plist"
SRC="$(cd "$(dirname "$0")" && pwd)/pliki"
NODE_LINE="22"
NODE_MIN="22.13.0"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
info() { printf '  %s\n' "$1"; }
fail() { printf '\n  \033[31m✗ %s\033[0m\n\n' "$1"; read -r -p "  Naciśnij Enter, żeby zamknąć okno… " _ || true; exit 1; }
trap 'fail "Instalacja przerwana. Sprawdź połączenie z internetem i uruchom instalator ponownie."' ERR

clear 2>/dev/null || true
echo
bold "  Hermes CRM $VERSION · instalacja na tym Macu"
echo
[ "$(uname -s)" = "Darwin" ] || fail "Ten instalator działa tylko na macOS."
[ -f "$SRC/server/hermes.mjs" ] || fail "Brak plików aplikacji. Rozpakuj całe archiwum i uruchom instalator z rozpakowanego folderu."

case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  x86_64) ARCH="x64" ;;
  *) fail "Nieobsługiwany procesor: $(uname -m)." ;;
esac

ver_ge() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -t. -k1,1n -k2,2n -k3,3n | head -1)" = "$2" ]; }

# 1. Zatrzymanie poprzedniej wersji (aktualizacja)
if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$AGENT" 2>/dev/null || true
  sleep 1
  ok "Zatrzymano poprzednią wersję"
fi

# 2. Środowisko Node.js w aplikacji (oficjalna wersja z nodejs.org, sprawdzona sumą SHA 256)
TMP="$(mktemp -d)"
NODE_BIN=""; LINK=0
OLD_NODE="$APP/Contents/Resources/node/node"
if [ -L "$OLD_NODE" ] && [ -x "$OLD_NODE" ] && ver_ge "$("$OLD_NODE" -p 'process.versions.node' 2>/dev/null || echo 0)" "$NODE_MIN"; then
  NODE_BIN="$(readlink "$OLD_NODE")"; LINK=1
  ok "Node.js $("$NODE_BIN" -p 'process.versions.node') już zainstalowany"
elif [ -x "$OLD_NODE" ] && ver_ge "$("$OLD_NODE" -p 'process.versions.node' 2>/dev/null || echo 0)" "$NODE_MIN"; then
  cp "$OLD_NODE" "$TMP/node"; NODE_BIN="$TMP/node"
  ok "Node.js $("$NODE_BIN" -p 'process.versions.node') już zainstalowany"
elif [ -n "${HERMES_NODE:-}" ] && [ -x "$HERMES_NODE" ]; then
  NODE_BIN="$HERMES_NODE"; LINK=1
else
  info "Pobieram Node.js $NODE_LINE (około 50 MB)…"
  BASE="https://nodejs.org/dist/latest-v$NODE_LINE.x"
  if curl -fsSL "$BASE/SHASUMS256.txt" -o "$TMP/sums.txt"; then
    FILE="$(grep -o "node-v$NODE_LINE[0-9.]*-darwin-$ARCH.tar.gz" "$TMP/sums.txt" | head -1)"
    [ -n "$FILE" ] || fail "Nie znaleziono Node.js dla tego procesora."
    curl -fL --progress-bar "$BASE/$FILE" -o "$TMP/$FILE"
    WANT="$(grep " $FILE\$" "$TMP/sums.txt" | awk '{print $1}')"
    GOT="$(shasum -a 256 "$TMP/$FILE" | awk '{print $1}')"
    [ "$WANT" = "$GOT" ] || fail "Pobrany plik Node.js jest uszkodzony. Spróbuj ponownie."
    tar -xzf "$TMP/$FILE" -C "$TMP"
    NODE_BIN="$(find "$TMP" -path '*/bin/node' -type f | head -1)"
    ok "Pobrano Node.js $("$NODE_BIN" -p 'process.versions.node')"
  elif command -v node >/dev/null 2>&1 && ver_ge "$(node -p 'process.versions.node')" "$NODE_MIN"; then
    NODE_BIN="$(command -v node)"; LINK=1
    info "Brak dostępu do nodejs.org, używam Node.js zainstalowanego w systemie."
  else
    fail "Nie udało się pobrać Node.js. Sprawdź internet albo zainstaluj Node.js 22 ze strony nodejs.org."
  fi
fi

# 3. Aplikacja
mkdir -p "$HOME/Applications"
rm -rf "$APP.new"
mkdir -p "$APP.new/Contents/MacOS" "$APP.new/Contents/Resources/node"
cp -R "$SRC" "$APP.new/Contents/Resources/app"
if [ "$LINK" = 1 ]; then
  ln -s "$NODE_BIN" "$APP.new/Contents/Resources/node/node"
else
  cp "$NODE_BIN" "$APP.new/Contents/Resources/node/node"; chmod 755 "$APP.new/Contents/Resources/node/node"
fi

cat > "$APP.new/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Hermes CRM</string>
  <key>CFBundleDisplayName</key><string>Hermes CRM</string>
  <key>CFBundleIdentifier</key><string>$LABEL.app</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleExecutable</key><string>Hermes CRM</string>
  <key>CFBundleIconFile</key><string>Hermes</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><true/>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict></plist>
PLIST

# skrypt usługi: wczytuje ustawienia i uruchamia serwer
cat > "$APP.new/Contents/Resources/run.sh" <<'RUN'
#!/bin/bash
R="$(cd "$(dirname "$0")" && pwd)"
DATA="$HOME/Library/Application Support/Hermes CRM"
set -a; [ -f "$DATA/ustawienia.env" ] && . "$DATA/ustawienia.env"; set +a
export NODE_NO_WARNINGS=1 APP_FILE="$R/app/index.html" ASSETS_DIR="$R/app/assets" SQLITE_PATH="${SQLITE_PATH:-$DATA/hermes.db}"
exec "$R/node/node" "$R/app/server/hermes.mjs"
RUN
chmod 755 "$APP.new/Contents/Resources/run.sh"

# ikona aplikacji: uruchamia usługę, jeśli stoi, i otwiera CRM w przeglądarce
cat > "$APP.new/Contents/MacOS/Hermes CRM" <<'OPEN'
#!/bin/bash
DATA="$HOME/Library/Application Support/Hermes CRM"
PORT=3210; [ -f "$DATA/ustawienia.env" ] && . "$DATA/ustawienia.env"
URL="http://localhost:$PORT"
up() { curl -fs -m 2 "$URL/health" >/dev/null 2>&1; }
if ! up; then
  launchctl kickstart -k "gui/$(id -u)/pl.hermes.crm" >/dev/null 2>&1 || launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/pl.hermes.crm.plist" >/dev/null 2>&1 || true
  for _ in $(seq 1 40); do up && break; sleep 0.5; done
fi
if up; then open "$URL"; else osascript -e 'display alert "Hermes CRM nie wystartował" message "Szczegóły są w pliku hermes.log w folderze ~/Library/Application Support/Hermes CRM." as warning' >/dev/null 2>&1; fi
OPEN
chmod 755 "$APP.new/Contents/MacOS/Hermes CRM"

# ikona .icns z PNG (narzędzia wbudowane w macOS)
ICON_SRC="$SRC/assets/icon-512.png"
if [ -f "$ICON_SRC" ] && command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
  SET="$TMP/Hermes.iconset"; mkdir -p "$SET"
  for s in 16 32 128 256 512; do
    sips -z $s $s "$ICON_SRC" --out "$SET/icon_${s}x${s}.png" >/dev/null 2>&1 || true
    d=$((s * 2)); [ $d -le 512 ] && sips -z $d $d "$ICON_SRC" --out "$SET/icon_${s}x${s}@2x.png" >/dev/null 2>&1 || true
  done
  iconutil -c icns "$SET" -o "$APP.new/Contents/Resources/Hermes.icns" >/dev/null 2>&1 || true
fi

rm -rf "$APP"; mv "$APP.new" "$APP"
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
touch "$APP"
ok "Aplikacja: ~/Applications/Hermes CRM"

# 4. Dane i ustawienia (zostają przy aktualizacji)
mkdir -p "$DATA"
if [ ! -f "$DATA/ustawienia.env" ]; then
  PORT=3210
  while lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1 && [ $PORT -lt 3240 ]; do PORT=$((PORT + 1)); done
  cat > "$DATA/ustawienia.env" <<ENV
# Ustawienia Hermes CRM. Po zmianie kliknij ikonę Hermes CRM albo uruchom instalator ponownie.
PORT=$PORT
# 127.0.0.1 = CRM dostępny tylko na tym Macu. Wpisz 0.0.0.0, żeby otworzyć go z innych urządzeń w sieci.
HOST=127.0.0.1
PUBLIC_URL=http://localhost:$PORT
NODE_ENV=production
LOG_LEVEL=warn
# Poranny plan dnia mailem wymaga SMTP_URL; puste wyłącza.
DIGEST_HOUR=
# Opcjonalnie: klucz Claude API dla Hermes AI na serwerze
ANTHROPIC_API_KEY=
# Opcjonalnie: wysyłka maili (zaproszenia, potwierdzenia spotkań), np. smtps://login:haslo@smtp.dostawca.pl:465
SMTP_URL=
MAIL_FROM=
ENV
  ok "Ustawienia: ~/Library/Application Support/Hermes CRM/ustawienia.env"
else
  ok "Zachowano Twoje dane i ustawienia"
fi
# shellcheck disable=SC1091
PORT="$(. "$DATA/ustawienia.env"; echo "${PORT:-3210}")"
if [ -f "$DATA/hermes.db" ]; then
  # spójna kopia bazy razem z dziennikiem WAL (VACUUM INTO), zanim nowa wersja uruchomi migracje
  rm -f "$DATA/hermes-przed-aktualizacja.db"
  HERMES_DB="$DATA/hermes.db" HERMES_BAK="$DATA/hermes-przed-aktualizacja.db" "$APP/Contents/Resources/node/node" -e \
    "const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(process.env.HERMES_DB); d.prepare('VACUUM INTO ?').run(process.env.HERMES_BAK); d.close();" 2>/dev/null \
    && ok "Kopia bazy przed aktualizacją: hermes-przed-aktualizacja.db" || cp "$DATA/hermes.db" "$DATA/hermes-przed-aktualizacja.db" 2>/dev/null || true
fi

# 5. Usługa w tle: start po zalogowaniu i automatyczny restart
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$AGENT" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$APP/Contents/Resources/run.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$DATA/hermes.log</string>
  <key>StandardErrorPath</key><string>$DATA/hermes.log</string>
  <key>ProcessType</key><string>Background</string>
</dict></plist>
PLIST
launchctl bootstrap "gui/$(id -u)" "$AGENT" 2>/dev/null || launchctl load -w "$AGENT" 2>/dev/null || true
launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>/dev/null || true

info "Uruchamiam Hermes CRM…"
URL="http://localhost:$PORT"
for _ in $(seq 1 60); do curl -fs -m 2 "$URL/health" >/dev/null 2>&1 && break; sleep 0.5; done
curl -fs -m 2 "$URL/health" >/dev/null 2>&1 || fail "Serwer nie wystartował. Szczegóły: ~/Library/Application Support/Hermes CRM/hermes.log"
ok "Hermes CRM działa pod adresem $URL"
rm -rf "$TMP"
trap - ERR

echo
bold "  Gotowe!"
echo
info "Za chwilę CRM otworzy się w przeglądarce. Załóż konto: pierwsze konto zakłada firmę."
info "Później otwieraj CRM ikoną Hermes CRM w Programach albo adresem $URL"
info "CRM uruchamia się sam po zalogowaniu do Maca. Dane są tylko na tym komputerze."
echo
open "$URL"
read -r -p "  Naciśnij Enter, żeby zamknąć okno… " _ || true
