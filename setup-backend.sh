#!/bin/bash

echo "🚀 Setting up Library Monitor Hub Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Navigate to backend directory
cd backend

echo "📦 Installing backend dependencies..."
npm install

echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file. Please update DATABASE_URL with your PostgreSQL credentials."
    echo "   Example: DATABASE_URL=\"postgresql://username:password@localhost:5432/library_monitor_hub\""
fi

echo "🗄️ Setting up database..."
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with sample data
npm run db:seed

echo "✅ Backend setup complete!"
echo ""
echo "🔑 Login credentials:"
echo "   Librarian: admin@school.edu / password123"
echo "   Monitor: ben@student.school.edu / password123"
echo "   Monitor: chloe@student.school.edu / password123"
echo ""
echo "🚀 To start the backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "🌐 Backend will run on http://localhost:3001"