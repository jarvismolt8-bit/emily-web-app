#!/bin/bash
# Cashflow Manager DB Backup Script
# Uses SQLite .backup (safe for WAL mode) instead of cp
# Stores backups in /var/backups/cashflow-manager/ with 7-day rotation
# Optionally uploads to GitHub releases for off-server protection

set -euo pipefail

DB_PATH="/var/www/cashflow-manager/backend/db/cashflow.db"
BACKUP_DIR="/var/backups/cashflow-manager"
TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_FILE="cashflow-${TIMESTAMP}.db"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
RETENTION_DAYS=7
LOG_FILE="/var/log/cashflow/backup.log"
REPO="jarvismolt8-bit/emily-web-app"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Verify source DB exists and is not empty
if [ ! -f "$DB_PATH" ]; then
  log "ERROR: Database not found at $DB_PATH"
  exit 1
fi

DB_SIZE=$(stat -c%s "$DB_PATH")
if [ "$DB_SIZE" -lt 10240 ]; then
  log "ERROR: Database too small (${DB_SIZE} bytes) — likely empty/corrupt. Skipping backup."
  exit 1
fi

# Use SQLite .backup for atomic, WAL-safe copy
log "Starting backup: $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '${BACKUP_PATH}'"

# Verify backup
BACKUP_SIZE=$(stat -c%s "$BACKUP_PATH")
if [ "$BACKUP_SIZE" -lt 10240 ]; then
  log "ERROR: Backup file too small (${BACKUP_SIZE} bytes). Removing."
  rm -f "$BACKUP_PATH"
  exit 1
fi

log "Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE} bytes)"

# Rotate: delete backups older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name "cashflow-*.db" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  log "Rotated: deleted ${DELETED} backups older than ${RETENTION_DAYS} days"
fi

# Off-server upload to GitHub releases (Layer 3)
if command -v gh &> /dev/null; then
  TAG="db-backup-$(date +%Y%m%d)"

  # Check if release already exists for today
  if gh release view "$TAG" --repo "$REPO" &> /dev/null; then
    # Upload as additional asset to existing release
    gh release upload "$TAG" "$BACKUP_PATH" --repo "$REPO" --clobber 2>/dev/null && \
      log "Uploaded to existing GitHub release: $TAG" || \
      log "WARNING: GitHub upload failed (non-fatal)"
  else
    # Create new release and upload
    gh release create "$TAG" "$BACKUP_PATH" \
      --repo "$REPO" \
      --title "DB Backup $(date +%Y-%m-%d)" \
      --notes "Automated daily database backup" \
      --latest=false 2>/dev/null && \
      log "Created GitHub release: $TAG" || \
      log "WARNING: GitHub release creation failed (non-fatal)"
  fi
else
  log "NOTE: gh CLI not found — skipping off-server upload"
fi

# Summary
TOTAL=$(find "$BACKUP_DIR" -name "cashflow-*.db" | wc -l)
log "Backups on disk: ${TOTAL} | Retention: ${RETENTION_DAYS} days"
