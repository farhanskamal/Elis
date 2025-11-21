@echo off
echo ===================================================
echo   Library Monitor Hub - Remote Access Tunnel
echo ===================================================
echo.
echo [INFO] Starting Cloudflare Tunnel...
echo [INFO] This window must stay open for remote access to work.
echo [INFO] Remote URL: https://letstestit.me
echo.

REM Run the tunnel using the local config file
cloudflared.exe tunnel --config tunnel-config.yml run

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Tunnel failed to start.
    echo Please check your internet connection and credentials.
    pause
)
