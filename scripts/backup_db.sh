#!/bin/bash
# Backup script for EAISG Database
# Can be run via cron on the database host or via a Kubernetes CronJob

set -e

BACKUP_DIR="/var/backups/eaisg"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-eaisg}
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/eaisg_backup_$TIMESTAMP.sql.gz"

echo "Starting EAISG database backup to $BACKUP_FILE..."
# Ensure PGPASSWORD is set in the environment before running this script
pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "Backup completed successfully."

# Keep only the last 7 days of backups
find "$BACKUP_DIR" -type f -name "eaisg_backup_*.sql.gz" -mtime +7 -delete
echo "Old backups cleaned up."
