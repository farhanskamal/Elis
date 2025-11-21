@echo off
echo Exporting database...

REM Create backups directory if it doesn't exist
if not exist "backups" mkdir backups

REM Get current timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%"

set "FILENAME=backups\backup_%TIMESTAMP%.sql"

docker-compose exec -T db pg_dump -U postgres library_volunteer_hub > "%FILENAME%"

if %errorlevel% equ 0 (
    echo [SUCCESS] Database exported to %FILENAME%
) else (
    echo [ERROR] Failed to export database. Make sure the Docker container is running.
)
pause
