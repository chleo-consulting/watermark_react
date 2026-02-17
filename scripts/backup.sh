#!/usr/bin/env bash
set -euo pipefail

# Load .env.local if present
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

: "${BACKUP_SECRET:?BACKUP_SECRET is required}"
: "${APP_URL:?APP_URL is required}"

BACKUPS_DIR="$SCRIPT_DIR/../backups"
mkdir -p "$BACKUPS_DIR"

FILENAME="backup-$(date +%Y-%m-%d_%H%M%S).db"
OUTPUT="$BACKUPS_DIR/$FILENAME"

HTTP_CODE=$(curl -s -o "$OUTPUT" -w "%{http_code}" \
  -H "Authorization: Bearer $BACKUP_SECRET" \
  "$APP_URL/api/admin/backup")

echo "curl -s -o "$OUTPUT" -w "%{http_code}" \
  -H "Authorization: Bearer $BACKUP_SECRET" \
  "$APP_URL/api/admin/backup""

if [[ "$HTTP_CODE" -ne 200 ]]; then
  rm -f "$OUTPUT"
  echo "Error: backup failed with HTTP $HTTP_CODE" >&2
  exit 1
fi

SIZE=$(stat -c%s "$OUTPUT" 2>/dev/null || stat -f%z "$OUTPUT")
echo "Backup saved: $OUTPUT ($SIZE bytes)"
