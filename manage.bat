@echo off
setlocal enabledelayedexpansion

REM Colors for better output
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "WHITE=[97m"
set "RESET=[0m"

set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "MAINTENANCE_DIR=%PROJECT_ROOT%maintenance"
set "PIDS_DIR=%PROJECT_ROOT%pids"
set "LOGS_DIR=%PROJECT_ROOT%logs"

REM Create necessary directories
if not exist "%PIDS_DIR%" mkdir "%PIDS_DIR%"
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

REM PID files for process tracking
set "BACKEND_PID=%PIDS_DIR%\backend.pid"
set "CADDY_PID=%PIDS_DIR%\caddy.pid"
set "CLOUDFLARED_PID=%PIDS_DIR%\cloudflared.pid"

echo %CYAN%======================================%RESET%
echo %CYAN%   Library Monitor Hub Manager      %RESET%
echo %CYAN%======================================%RESET%
echo.

if "%1"=="" goto :show_menu
if /i "%1"=="start" goto :start_services
if /i "%1"=="stop" goto :stop_services
if /i "%1"=="restart" goto :restart_services
if /i "%1"=="status" goto :show_status
if /i "%1"=="maintenance" goto :maintenance_mode
if /i "%1"=="build" goto :build_project
if /i "%1"=="logs" goto :show_logs
if /i "%1"=="health" goto :check_health
goto :show_help

:show_menu
echo %WHITE%Available commands:%RESET%
echo   %GREEN%start%RESET%       - Start all services (backend, caddy, cloudflared)
echo   %RED%stop%RESET%        - Stop all services
echo   %YELLOW%restart%RESET%     - Restart all services
echo   %BLUE%status%RESET%      - Show service status
echo   %MAGENTA%maintenance%RESET% - Enable/disable maintenance mode
echo   %CYAN%build%RESET%       - Build the project
echo   %WHITE%logs%RESET%        - Show service logs
echo   %GREEN%health%RESET%      - Check system health
echo   %WHITE%help%RESET%        - Show this help
echo.
echo %YELLOW%Usage: manage.bat [command] [options]%RESET%
echo.
goto :end

:show_help
echo %WHITE%Library Monitor Hub Management Script%RESET%
echo.
echo %YELLOW%Commands:%RESET%
echo   %GREEN%start%RESET%                    - Start all services
echo   %RED%stop%RESET%                     - Stop all services  
echo   %YELLOW%restart%RESET%                  - Restart all services
echo   %BLUE%status%RESET%                   - Show current status
echo   %MAGENTA%maintenance on [reason]%RESET%  - Enable maintenance mode
echo   %MAGENTA%maintenance off%RESET%          - Disable maintenance mode
echo   %CYAN%build%RESET%                    - Build frontend and backend
echo   %WHITE%logs [service]%RESET%           - Show logs (backend/caddy/cloudflared)
echo   %GREEN%health%RESET%                   - Check system health
echo.
echo %YELLOW%Examples:%RESET%
echo   manage.bat start
echo   manage.bat maintenance on "Database migration in progress"
echo   manage.bat logs backend
echo.
goto :end

:start_services
echo %GREEN%🚀 Starting Library Monitor Hub services...%RESET%
echo.

REM Check if already running
call :check_service_status
if !BACKEND_RUNNING!==1 (
    echo %YELLOW%⚠️  Backend is already running%RESET%
) else (
    echo %BLUE%📡 Starting backend server...%RESET%
    cd /d "%BACKEND_DIR%"
    start "Backend Server" /min cmd /c "npm start > \"%LOGS_DIR%\backend.log\" 2>&1"
    
    REM Wait a moment for process to start and get PID
    timeout /t 2 /nobreak >nul
    
    REM Try to get the PID of the node process
    for /f "tokens=2" %%i in ('tasklist /fi "windowtitle eq Backend Server" /fo csv ^| find /c /v ""') do set BACKEND_COUNT=%%i
    if !BACKEND_COUNT! gtr 1 (
        for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv') do (
            echo %%i > "%BACKEND_PID%"
            echo %GREEN%✅ Backend started (PID: %%i)%RESET%
            goto :backend_started
        )
    )
    :backend_started
)

if !CADDY_RUNNING!==1 (
    echo %YELLOW%⚠️  Caddy is already running%RESET%
) else (
    echo %BLUE%🌐 Starting Caddy reverse proxy...%RESET%
    cd /d "%BACKEND_DIR%"
    start "Caddy Server" /min cmd /c "caddy_windows_amd64.exe run > \"%LOGS_DIR%\caddy.log\" 2>&1"
    timeout /t 2 /nobreak >nul
    echo %GREEN%✅ Caddy started%RESET%
)

if !CLOUDFLARED_RUNNING!==1 (
    echo %YELLOW%⚠️  Cloudflare tunnel is already running%RESET%
) else (
    echo %BLUE%☁️  Starting Cloudflare tunnel...%RESET%
    cd /d "%PROJECT_ROOT%"
    start "Cloudflare Tunnel" /min cmd /c "cloudflared.exe tunnel run > \"%LOGS_DIR%\cloudflared.log\" 2>&1"
    timeout /t 3 /nobreak >nul
    echo %GREEN%✅ Cloudflare tunnel started%RESET%
)

echo.
echo %GREEN%🎉 All services started successfully!%RESET%
echo %CYAN%🌐 Website should be available at: https://letstestit.me%RESET%
echo.
goto :end

:stop_services
echo %RED%🛑 Stopping Library Monitor Hub services...%RESET%
echo.

REM Disable maintenance mode first
call :disable_maintenance

REM Stop processes
echo %RED%📡 Stopping backend server...%RESET%
taskkill /f /im node.exe >nul 2>&1
if exist "%BACKEND_PID%" del "%BACKEND_PID%"

echo %RED%🌐 Stopping Caddy server...%RESET%
taskkill /f /im caddy_windows_amd64.exe >nul 2>&1
if exist "%CADDY_PID%" del "%CADDY_PID%"

echo %RED%☁️  Stopping Cloudflare tunnel...%RESET%
taskkill /f /im cloudflared.exe >nul 2>&1
if exist "%CLOUDFLARED_PID%" del "%CLOUDFLARED_PID%"

echo.
echo %GREEN%✅ All services stopped%RESET%
echo.
goto :end

:restart_services
echo %YELLOW%🔄 Restarting services...%RESET%
call :stop_services
timeout /t 3 /nobreak >nul
call :start_services
goto :end

:show_status
call :check_service_status

echo %WHITE%📊 Service Status:%RESET%
echo.
if !BACKEND_RUNNING!==1 (
    echo   Backend:     %GREEN%🟢 Running%RESET%
) else (
    echo   Backend:     %RED%🔴 Stopped%RESET%
)

if !CADDY_RUNNING!==1 (
    echo   Caddy:       %GREEN%🟢 Running%RESET%
) else (
    echo   Caddy:       %RED%🔴 Stopped%RESET%
)

if !CLOUDFLARED_RUNNING!==1 (
    echo   Cloudflared: %GREEN%🟢 Running%RESET%
) else (
    echo   Cloudflared: %RED%🔴 Stopped%RESET%
)

if exist "%MAINTENANCE_DIR%\active" (
    echo   Maintenance: %YELLOW%🟡 Enabled%RESET%
) else (
    echo   Maintenance: %GREEN%🟢 Disabled%RESET%
)

echo.

REM Check if website is accessible
echo %BLUE%🔍 Checking website accessibility...%RESET%
curl -s --max-time 10 "https://letstestit.me/health" >nul 2>&1
if !errorlevel!==0 (
    echo   Website:     %GREEN%🟢 Accessible at https://letstestit.me%RESET%
) else (
    echo   Website:     %RED%🔴 Not accessible%RESET%
)
echo.
goto :end

:maintenance_mode
if /i "%2"=="on" goto :enable_maintenance
if /i "%2"=="off" goto :disable_maintenance
echo %YELLOW%Usage: manage.bat maintenance [on/off] [reason]%RESET%
echo   on  - Enable maintenance mode (with optional reason)
echo   off - Disable maintenance mode
goto :end

:enable_maintenance
set "REASON=%3 %4 %5 %6 %7 %8 %9"
if "!REASON!"==" " set "REASON=System maintenance in progress"

echo %YELLOW%🚧 Enabling maintenance mode...%RESET%
echo Reason: !REASON!

REM Create maintenance flag
echo !REASON! > "%MAINTENANCE_DIR%\active"

REM Update Caddyfile to serve maintenance page
echo :80 { > "%BACKEND_DIR%\Caddyfile.maintenance"
echo 	encode gzip zstd >> "%BACKEND_DIR%\Caddyfile.maintenance"
echo 	root * "%MAINTENANCE_DIR%" >> "%BACKEND_DIR%\Caddyfile.maintenance"
echo 	rewrite * /index.html?reason=!REASON! >> "%BACKEND_DIR%\Caddyfile.maintenance"
echo 	file_server >> "%BACKEND_DIR%\Caddyfile.maintenance"
echo } >> "%BACKEND_DIR%\Caddyfile.maintenance"

REM Backup original Caddyfile and replace
copy "%BACKEND_DIR%\Caddyfile" "%BACKEND_DIR%\Caddyfile.backup" >nul
copy "%BACKEND_DIR%\Caddyfile.maintenance" "%BACKEND_DIR%\Caddyfile" >nul

REM Reload Caddy
echo %BLUE%🔄 Reloading Caddy configuration...%RESET%
cd /d "%BACKEND_DIR%"
caddy_windows_amd64.exe reload >nul 2>&1

echo %GREEN%✅ Maintenance mode enabled%RESET%
echo %CYAN%🌐 Visitors will see the maintenance page%RESET%
goto :end

:disable_maintenance
echo %GREEN%🔓 Disabling maintenance mode...%RESET%

REM Remove maintenance flag
if exist "%MAINTENANCE_DIR%\active" del "%MAINTENANCE_DIR%\active"

REM Restore original Caddyfile
if exist "%BACKEND_DIR%\Caddyfile.backup" (
    copy "%BACKEND_DIR%\Caddyfile.backup" "%BACKEND_DIR%\Caddyfile" >nul
    del "%BACKEND_DIR%\Caddyfile.backup" >nul
    if exist "%BACKEND_DIR%\Caddyfile.maintenance" del "%BACKEND_DIR%\Caddyfile.maintenance" >nul
    
    REM Reload Caddy
    echo %BLUE%🔄 Reloading Caddy configuration...%RESET%
    cd /d "%BACKEND_DIR%"
    caddy_windows_amd64.exe reload >nul 2>&1
    
    echo %GREEN%✅ Maintenance mode disabled%RESET%
    echo %CYAN%🌐 Website is now live%RESET%
) else (
    echo %YELLOW%⚠️  No backup Caddyfile found%RESET%
)
goto :end

:build_project
echo %CYAN%🏗️  Building Library Volunteer Hub...%RESET%
echo.

echo %BLUE%📦 Installing frontend dependencies...%RESET%
cd /d "%PROJECT_ROOT%"
call npm install
if !errorlevel! neq 0 (
    echo %RED%❌ Frontend dependency installation failed!%RESET%
    goto :end
)

echo %BLUE%🏗️  Building frontend...%RESET%
call npm run build
if !errorlevel! neq 0 (
    echo %RED%❌ Frontend build failed!%RESET%
    goto :end
)

echo %BLUE%📦 Installing backend dependencies...%RESET%
cd /d "%BACKEND_DIR%"
call npm install
if !errorlevel! neq 0 (
    echo %RED%❌ Backend dependency installation failed!%RESET%
    goto :end
)

echo %BLUE%🏗️  Building backend...%RESET%
call npm run build
if !errorlevel! neq 0 (
    echo %RED%❌ Backend build failed!%RESET%
    goto :end
)

echo %BLUE%🗄️  Updating database...%RESET%
call npm run db:generate
call npm run db:push

echo %GREEN%✅ Build completed successfully!%RESET%
goto :end

:show_logs
if /i "%2"=="backend" goto :show_backend_logs
if /i "%2"=="caddy" goto :show_caddy_logs  
if /i "%2"=="cloudflared" goto :show_cloudflared_logs

echo %YELLOW%Available logs:%RESET%
echo   backend      - Backend server logs
echo   caddy        - Caddy server logs
echo   cloudflared  - Cloudflare tunnel logs
echo.
echo %YELLOW%Usage: manage.bat logs [service]%RESET%
goto :end

:show_backend_logs
if exist "%LOGS_DIR%\backend.log" (
    type "%LOGS_DIR%\backend.log"
) else (
    echo %YELLOW%No backend logs found%RESET%
)
goto :end

:show_caddy_logs
if exist "%LOGS_DIR%\caddy.log" (
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

curl -s --max-time 10 "https://letstestit.me/health" > "%TEMP%\health.json" 2>nul
if !errorlevel!==0 (
    echo %GREEN%✅ Website is healthy%RESET%
    type "%TEMP%\health.json"
    del "%TEMP%\health.json" >nul 2>&1
) else (
    echo %RED%❌ Website health check failed%RESET%
    echo %YELLOW%Trying local backend...%RESET%
    curl -s --max-time 5 "http://localhost:3001/health" 2>nul
    if !errorlevel!==0 (
        echo %YELLOW%Backend is running locally but not accessible via domain%RESET%
    ) else (
        echo %RED%Backend is not responding%RESET%
    )
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