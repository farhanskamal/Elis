@echo off
echo 🚀 Starting production deployment...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js is available
echo.

REM Check backend environment configuration
echo 🔧 Checking backend environment configuration...
if exist "backend\.env" (
    echo ✅ Backend .env file found
    
    REM Check for HOST configuration
    findstr /i "HOST=" "backend\.env" >nul 2>&1
    if !errorlevel!==0 (
        for /f "tokens=2 delims==\"" %%i in ('findstr /i "HOST=" "backend\.env"') do (
            echo    Host binding: %%i
            if "%%i"=="0.0.0.0" (
                echo    ✅ Remote access enabled for production
            ) else (
                echo    ⚠️  Host is set to %%i - ensure this is correct for production
            )
        )
    ) else (
        echo    ⚠️  HOST not configured, will use default (0.0.0.0)
        echo    Adding HOST configuration for production...
        echo. >> "backend\.env"
        echo # Host binding configuration - use 0.0.0.0 for production remote access >> "backend\.env"
        echo HOST="0.0.0.0" >> "backend\.env"
        echo    ✅ HOST configuration added
    )
    
    REM Check NODE_ENV
    findstr /i "NODE_ENV=" "backend\.env" >nul 2>&1
    if !errorlevel!==0 (
        for /f "tokens=2 delims==\"" %%i in ('findstr /i "NODE_ENV=" "backend\.env"') do (
            echo    Environment: %%i
            if not "%%i"=="production" (
                echo    ⚠️  Consider setting NODE_ENV to 'production' for deployment
            )
        )
    ) else (
        echo    ⚠️  NODE_ENV not set, adding production configuration...
        echo NODE_ENV="production" >> "backend\.env"
        echo    ✅ NODE_ENV set to production
    )
) else (
    echo ❌ Backend .env file not found!
    echo Creating basic .env file for production...
    echo DATABASE_URL="postgres://username:password@localhost:5432/library_monitor_hub" > "backend\.env"
    echo JWT_SECRET="your-jwt-secret-here" >> "backend\.env"
    echo ADMIN_EMAIL="admin@school.edu" >> "backend\.env"
    echo NODE_ENV="production" >> "backend\.env"
    echo CORS_ORIGINS="https://letstestit.me,https://www.letstestit.me" >> "backend\.env"
    echo HOST="0.0.0.0" >> "backend\.env"
    echo    ✅ Basic .env file created
    echo    ⚠️  Please update DATABASE_URL and JWT_SECRET before starting!
)
echo.

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
echo 🌐 Production Deployment Guide:
echo.
echo 🚀 Quick Start (Recommended):
echo    manage.bat start
echo.
echo 🔧 Manual Start:
echo    1. cd backend
echo    2. npm run start
echo.
echo 📊 Health Checks:
echo    - Local:  http://localhost:3001/health
echo    - Public: https://letstestit.me/api/health
echo.
echo 🌐 Your application will be accessible at:
echo    - Website: https://letstestit.me
echo    - API:     https://letstestit.me/api/
echo.
echo ⚠️  Don't forget to:
echo    - Verify DATABASE_URL in backend/.env
echo    - Ensure JWT_SECRET is properly set
echo    - Start all services: manage.bat start
echo.

cd ..
pause