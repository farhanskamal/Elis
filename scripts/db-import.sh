#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./db-import.sh <filename.sql>"
    exit 1
fi

FILE=$1

if [ ! -f "$FILE" ]; then
    echo "[ERROR] File not found: $FILE"
    exit 1
fi

echo "Importing $FILE..."
echo "WARNING: This will OVERWRITE the current database."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

docker-compose exec -T db psql -U postgres -d library_volunteer_hub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
cat "$FILE" | docker-compose exec -T db psql -U postgres -d library_volunteer_hub

echo "[SUCCESS] Import complete."
