#!/bin/bash
# Buduje instalator macOS: serwer spakowany esbuild do jednego pliku, frontend, ikony, skrypty i instrukcja.
# Wynik: dist/Hermes-CRM-<wersja>-macOS.zip
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
NAME="Hermes CRM $VERSION"
OUT="$ROOT/dist"
STAGE="$OUT/stage/$NAME"
rm -rf "$OUT/stage" && mkdir -p "$STAGE/pliki/server" "$STAGE/pliki/assets"

(cd "$ROOT/server" && npx -y esbuild@0.28.2 src/server.ts --bundle --platform=node --format=esm --target=node22 \
  --outfile="$STAGE/pliki/server/hermes.mjs" --external:pg-native --legal-comments=none --log-level=warning \
  --banner:js="import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);")
cp "$ROOT/index.html" "$STAGE/pliki/"
cp "$ROOT"/assets/* "$STAGE/pliki/assets/"
printf '{"name":"hermes-crm","version":"%s","private":true,"type":"module"}\n' "$VERSION" > "$STAGE/pliki/package.json"
for f in "Zainstaluj Hermes CRM.command" "Odinstaluj Hermes CRM.command" "Przeczytaj.txt"; do
  sed "s/__VERSION__/$VERSION/g" "$ROOT/installer/macos/$f" > "$STAGE/$f"
done
chmod 755 "$STAGE"/*.command

ZIP="$OUT/Hermes-CRM-$VERSION-macOS.zip"
rm -f "$ZIP"
(cd "$OUT/stage" && zip -qr -X "$ZIP" "$NAME")
rm -rf "$OUT/stage"
echo "Gotowe: $ZIP ($(du -h "$ZIP" | cut -f1))"
