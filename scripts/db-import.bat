@echo off
setlocal
echo ==========================================
echo      Database Import Tool (Docker)
echo ==========================================

set /p FILE="Enter the filename of the SQL backup to import (e.g. backup_2023.sql): "

if not exist "%FILE%" (
    echo [ERROR] File not found: %FILE%
    pause
    exit /b 1
)

echo.
echo [WARNING] This will OVERWRITE the current database!
set /p CONFIRM="Are you sure? (y/n): "
if /i "%CONFIRM%" neq "y" exit /b

echo.
echo Importing %FILE%...

REM Drop and recreate schema to ensure clean slate
docker-compose exec -T db psql -U postgres -d library_volunteer_hub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

REM Import data
type "%FILE%" | docker-compose exec -T db psql -U postgres -d library_volunteer_hub

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Database imported successfully!
) else (
    echo.
    echo [ERROR] Import failed.
)

pause
