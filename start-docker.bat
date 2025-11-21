@echo off
setlocal EnableDelayedExpansion

echo ===================================================
echo   Library Monitor Hub - Docker Launcher
echo ===================================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please install Docker Desktop and ensure it is running.
    echo Download: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check for .env file
if not exist .env (
    echo [WARNING] .env file not found. Creating from example...
    if exist .env.example (
        copy .env.example .env
    ) else (
        echo [INFO] Creating default .env...
        echo DATABASE_URL=postgresql://postgres:postgres@db:5432/library_volunteer_hub > .env
        echo JWT_SECRET=change_this_secret_in_production >> .env
        echo NODE_ENV=production >> .env
    )
)

REM Cloudflare Tunnel is now handled by start-tunnel.bat

echo.
echo [INFO] Building and starting services...
echo This may take a few minutes on the first run.
echo.

docker-compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Application started!

    echo.
    echo Local Access:  http://localhost
    echo.
    echo [INFO] Launching Remote Access Tunnel...
    start "Library Hub Tunnel" start-tunnel.bat
    echo Remote Access: https://letstestit.me
    echo.
    echo To stop the app, run: docker-compose down
) else (
    echo.
    echo [ERROR] Failed to start services.
)

pause
