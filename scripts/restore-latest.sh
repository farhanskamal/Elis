#!/bin/bash

echo "=========================================="
echo "   Restore Latest Backup"
echo "=========================================="

# Find most recent backup
LATEST=$(ls -t backups/backup_*.sql 2>/dev/null | head -n 1)

if [ -z "$LATEST" ]; then
    echo "[ERROR] No backup files found in backups/ directory"
    exit 1
fi

echo "Found latest backup: $LATEST"
echo
echo "[WARNING] This will OVERWRITE the current database!"
read -p "Are you sure? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo "Restoring $LATEST..."

# Drop and recreate schema
docker-compose exec -T db psql -U postgres -d library_volunteer_hub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Import data
cat "$LATEST" | docker-compose exec -T db psql -U postgres -d library_volunteer_hub

echo "[SUCCESS] Database restored from $LATEST!"
