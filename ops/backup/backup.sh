#!/bin/sh
# Szyfrowana kopia bazy Hermesa. Odtworzenie:
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in plik.sql.gz.enc | gunzip | psql "$DATABASE_URL"
set -eu
(set -o pipefail) 2>/dev/null && set -o pipefail
DIR="${BACKUP_DIR:-/backups}"
HOUR="${BACKUP_HOUR:-2}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Kopie wyłączone: ustaw BACKUP_PASSPHRASE w pliku .env"; exec sleep infinity
fi
run() {
  f="$DIR/hermes-$(date +%Y-%m-%d-%H%M).sql.gz.enc"
  pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$f.tmp"
  mv "$f.tmp" "$f"
  find "$DIR" -name 'hermes-*.sql.gz.enc' -mtime +"$KEEP" -delete
  echo "Kopia gotowa: $f ($(du -h "$f" | cut -f1))"
}
[ "${1:-}" = "now" ] && { run; exit 0; }
run
while true; do
  now=$(date +%s); next=$(date -d "$(date +%Y-%m-%d) $(printf %02d "$HOUR"):00" +%s 2>/dev/null || echo $((now + 86400)))
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now)); run || echo "Kopia nieudana"
done
