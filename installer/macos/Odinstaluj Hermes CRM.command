#!/bin/bash
# Odinstalowanie Hermes CRM z macOS. Dane zostają, chyba że wybierzesz ich usunięcie.
set -uo pipefail
LABEL="pl.hermes.crm"
APP="$HOME/Applications/Hermes CRM.app"
DATA="$HOME/Library/Application Support/Hermes CRM"
AGENT="$HOME/Library/LaunchAgents/$LABEL.plist"

echo
printf '\033[1m  Hermes CRM · odinstalowanie\033[0m\n\n'
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || launchctl unload "$AGENT" 2>/dev/null || true
rm -f "$AGENT"
rm -rf "$APP"
echo "  ✓ Usunięto aplikację i usługę w tle"
if [ -d "$DATA" ]; then
  echo
  echo "  Twoje dane (baza klientów i ustawienia) są w:"
  echo "  $DATA"
  read -r -p "  Usunąć je na zawsze? Wpisz TAK, żeby usunąć, albo naciśnij Enter, żeby zostawić: " A || A=""
  if [ "$A" = "TAK" ]; then rm -rf "$DATA"; echo "  ✓ Usunięto dane"; else echo "  ✓ Dane zostały na dysku"; fi
fi
echo
read -r -p "  Naciśnij Enter, żeby zamknąć okno… " _ || true
