@echo off
setlocal
echo ==========================================
echo   Restore Latest Backup
echo ==========================================

REM Find most recent backup
for /f "delims=" %%i in ('dir /b /o-d backups\backup_*.sql 2^>nul') do (
    set "LATEST=%%i"
    goto :found
)

echo [ERROR] No backup files found in backups\ directory
pause
exit /b 1

:found
set "FILE=backups\%LATEST%"
echo Found latest backup: %FILE%
echo.
echo [WARNING] This will OVERWRITE the current database!
set /p CONFIRM="Are you sure? (y/n): "
if /i "%CONFIRM%" neq "y" exit /b

echo.
echo Restoring %FILE%...

REM Drop and recreate schema
docker-compose exec -T db psql -U postgres -d library_volunteer_hub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

REM Import data
type "%FILE%" | docker-compose exec -T db psql -U postgres -d library_volunteer_hub

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Database restored from %LATEST%!
) else (
    echo.
    echo [ERROR] Restore failed.
)

pause
