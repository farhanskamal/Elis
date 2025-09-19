@echo off
echo 🚀 Starting production deployment...

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
call npm install

echo 🏗️ Building frontend for production...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)

echo 📦 Installing backend dependencies...
cd backend
call npm install

echo 🏗️ Building backend for production...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Backend build failed!
    cd ..
    pause
    exit /b 1
)

echo 🗄️ Generating Prisma client...
call npm run db:generate
if %errorlevel% neq 0 (
    echo ❌ Prisma client generation failed!
    cd ..
    pause
    exit /b 1
)

echo 🗄️ Pushing database schema...
call npm run db:push
if %errorlevel% neq 0 (
    echo ❌ Database schema push failed!
    cd ..
    pause
    exit /b 1
)

echo ✅ Production build completed successfully!
echo.
echo 🔧 To start the production server:
echo    1. cd backend
echo    2. npm run start
echo.
echo 🌐 Don't forget to:
echo    - Configure your production environment variables (.env)
echo    - Start Cloudflare tunnel: .\cloudflared.exe tunnel run
echo    - Start Caddy reverse proxy: cd backend && .\caddy_windows_amd64.exe run
echo.

cd ..
pause