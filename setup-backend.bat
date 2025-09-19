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
    copy .env.example .env
    echo ✅ Created .env file. Please update DATABASE_URL with your PostgreSQL credentials.
    echo    Example: DATABASE_URL="postgresql://username:password@localhost:5432/library_monitor_hub"
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
echo 🔑 Login credentials:
echo    Librarian: admin@school.edu / password123
echo    Monitor: ben@student.school.edu / password123
echo    Monitor: chloe@student.school.edu / password123
echo.
echo 🚀 To start the backend server:
echo    cd backend && npm run dev
echo.
echo 🌐 Backend will run on http://localhost:3001
pause