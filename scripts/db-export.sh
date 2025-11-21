#!/bin/bash

# Create backups directory if it doesn't exist
mkdir -p backups

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="backups/backup_${TIMESTAMP}.sql"

echo "Exporting database to $FILENAME..."

docker-compose exec -T db pg_dump -U postgres library_volunteer_hub > "$FILENAME"

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Database exported."
else
    echo "[ERROR] Failed to export database."
fi
