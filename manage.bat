@echo off
setlocal

REM Wrapper to forward all commands to PowerShell manage.ps1
set "PS_SCRIPT=%~dp0manage.ps1"

if not exist "%PS_SCRIPT%" (
  echo manage.ps1 not found next to this script.
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*

exit /b %ERRORLEVEL%
    type "%LOGS_DIR%\caddy.log"
) else (
    echo %YELLOW%No Caddy logs found%RESET%
)
goto :end

:show_cloudflared_logs
if exist "%LOGS_DIR%\cloudflared.log" (
    type "%LOGS_DIR%\cloudflared.log"
) else (
    echo %YELLOW%No Cloudflare logs found%RESET%
)
goto :end

:check_health
echo %GREEN%🏥 Checking system health...%RESET%
echo.

REM Check backend configuration first
cd /d "%BACKEND_DIR%"
echo %CYAN%🔧 Backend Configuration:%RESET%
if exist .env (
    findstr /i "HOST=" .env >nul 2>&1
    if !errorlevel!==0 (
        findstr /i "HOST=\"0.0.0.0\"" .env >nul 2>&1
        if !errorlevel!==0 (
            echo   Host: 0.0.0.0 (All interfaces)
        ) else (
            findstr /i "HOST=\"127.0.0.1\"" .env >nul 2>&1
            if !errorlevel!==0 (
                echo   Host: 127.0.0.1 (Localhost only)
            ) else (
                echo   Host: Custom configuration
            )
        )
    ) else (
        echo   Host: Default (0.0.0.0)
    )
) else (
    echo   %RED%❌ .env file missing!%RESET%
)
echo.

REM Test public API endpoint
echo %BLUE%🌐 Testing public API...%RESET%
curl -s --max-time 10 "https://letstestit.me/api/health" > "%TEMP%\health.json" 2>nul
if !errorlevel!==0 (
    echo %GREEN%✅ Public API is healthy%RESET%
    echo %CYAN%Response:%RESET%
    type "%TEMP%\health.json"
    del "%TEMP%\health.json" >nul 2>&1
echo.
) else (
    echo %RED%❌ Public API health check failed%RESET%
)

REM Test local backend
echo %BLUE%📡 Testing local backend...%RESET%
curl -s --max-time 5 "http://localhost:3001/health" > "%TEMP%\local_health.json" 2>nul
if !errorlevel!==0 (
    echo %GREEN%✅ Local backend is responding%RESET%
    echo %CYAN%Response:%RESET%
    type "%TEMP%\local_health.json"
    del "%TEMP%\local_health.json" >nul 2>&1
) else (
    echo %RED%❌ Local backend is not responding%RESET%
)
echo.
goto :end

:check_service_status
set "BACKEND_RUNNING=0"
set "CADDY_RUNNING=0"  
set "CLOUDFLARED_RUNNING=0"

tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
if !errorlevel!==0 set "BACKEND_RUNNING=1"

tasklist /fi "imagename eq caddy_windows_amd64.exe" 2>nul | find /i "caddy" >nul
if !errorlevel!==0 set "CADDY_RUNNING=1"

tasklist /fi "imagename eq cloudflared.exe" 2>nul | find /i "cloudflared" >nul  
if !errorlevel!==0 set "CLOUDFLARED_RUNNING=1"
goto :eof

:end
echo.
pause