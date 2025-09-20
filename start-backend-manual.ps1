# Manual Backend Startup Script
Write-Host "🚀 Starting backend manually with error logging..." -ForegroundColor Green

Set-Location backend

# Kill any existing node processes to start fresh
Write-Host "Stopping any existing backend processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Start backend in development mode with console output
Write-Host "Starting backend in development mode..." -ForegroundColor Blue
Write-Host "Press Ctrl+C to stop the backend when needed." -ForegroundColor Yellow
Write-Host "Keep this window open and running." -ForegroundColor Yellow
Write-Host ""

# This will start the backend and keep it running
npm run dev