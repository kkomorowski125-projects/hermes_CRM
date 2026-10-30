# Kopie bazy: pg_dump co noc, kompresja i szyfrowanie AES 256, przechowywanie przez BACKUP_KEEP_DAYS dni.
FROM postgres:16-alpine
RUN apk add --no-cache openssl
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
ENTRYPOINT ["/usr/local/bin/backup.sh"]
