#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>"
  echo "Example: $0 ./data/backups/db_backup_2023-10-27_15-00-00.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' does not exist."
  exit 1
fi

DB_USER="hunty"
DB_NAME="hunty_dev"

CONTAINER_ID=$(docker ps -qf "name=db")
if [ -z "$CONTAINER_ID" ]; then
  echo "Error: Database container not found. Ensure docker-compose is running."
  exit 1
fi

echo "WARNING: This will overwrite the existing database '${DB_NAME}'."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Terminating existing connections to the database..."
docker exec "${CONTAINER_ID}" psql -U "${DB_USER}" -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

echo "Restoring database from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_ID}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists

echo "Database restore completed successfully."
