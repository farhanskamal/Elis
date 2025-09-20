@echo off
echo 🚀 Setting up Library Monitor Hub Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed. Please install PostgreSQL first.
    pause
    exit /b 1
)

REM Navigate to backend directory
cd backend

echo 📦 Installing backend dependencies...
call npm install

echo 🔧 Setting up environment variables...
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo ✅ Created .env file from template.
    ) else (
        echo Creating basic .env file...
        echo DATABASE_URL="postgresql://username:password@localhost:5432/library_monitor_hub" > .env
        echo JWT_SECRET="your-jwt-secret-here" >> .env
        echo ADMIN_EMAIL="admin@school.edu" >> .env
        echo NODE_ENV="development" >> .env
        echo CORS_ORIGINS="https://letstestit.me,https://www.letstestit.me" >> .env
        echo ✅ Created basic .env file.
    )
    
    REM Add HOST configuration for remote access
    echo. >> .env
    echo # Host binding configuration - use 0.0.0.0 for all interfaces (remote access) or 127.0.0.1 for localhost only >> .env
    echo HOST="0.0.0.0" >> .env
    echo ✅ Added HOST configuration for remote access.
    
    echo.
    echo ⚠️  Please update the following in your .env file:
    echo    - DATABASE_URL with your PostgreSQL credentials
    echo    - JWT_SECRET with a secure random string
    echo    Example: DATABASE_URL="postgresql://username:password@localhost:5432/library_monitor_hub"
) else (
    echo ✅ .env file already exists.
    
    REM Check if HOST is configured
    findstr /i "HOST=" .env >nul 2>&1
    if !errorlevel! neq 0 (
        echo    Adding HOST configuration for remote access...
        echo. >> .env
        echo # Host binding configuration - use 0.0.0.0 for all interfaces (remote access) or 127.0.0.1 for localhost only >> .env
        echo HOST="0.0.0.0" >> .env
        echo    ✅ HOST configuration added.
    ) else (
        echo    ✅ HOST configuration already present.
    )
)

echo 🗄️ Setting up database...
REM Generate Prisma client
call npm run db:generate

REM Push schema to database
call npm run db:push

REM Seed database with sample data
call npm run db:seed

echo ✅ Backend setup complete!
echo.
echo 🌐 Remote Access Configuration:
echo    ✅ Backend configured to accept connections from all interfaces
echo    ✅ HOST=0.0.0.0 enables remote access
echo    ✅ CORS configured for https://letstestit.me
echo.
echo 🔑 Default Login Credentials:
echo    Librarian: admin@school.edu / password123
echo    Monitor: ben@student.school.edu / password123
echo    Monitor: chloe@student.school.edu / password123
echo.
echo 🚀 To start the backend server:
echo    Option 1 (Development): cd backend && npm run dev
echo    Option 2 (All Services): manage.bat start
echo.
echo 🌐 Backend Access:
echo    - Local:  http://localhost:3001
echo    - Remote: http://YOUR_IP:3001 (if firewall configured)
echo    - Public: https://letstestit.me/api/ (via Cloudflare + Caddy)
echo.
echo 📊 Health Check:
echo    - Local:  http://localhost:3001/health
echo    - Public: https://letstestit.me/api/health
pause