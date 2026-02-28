#!/usr/bin/env sh
set -eu

DUMP_FILE="/dumps/app.dump"

if [ ! -f "$DUMP_FILE" ]; then
  echo "[init] Dump not found at $DUMP_FILE, skipping restore."
  exit 0
fi

echo "[init] Restoring demo dump into database '$POSTGRES_DB'..."
pg_restore \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  "$DUMP_FILE"

echo "[init] Restore finished."