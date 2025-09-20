# Complete Solution - Start All Services for Remote Access
Write-Host "🚀 Starting all services for remote access..." -ForegroundColor Green

# Stop any existing processes first
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "caddy_windows_amd64" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep 2

# Start backend in development mode
Write-Host "1. Starting backend server..." -ForegroundColor Blue
Set-Location backend
$backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Minimized
Set-Location ..

Write-Host "   Waiting for backend to start..." -ForegroundColor Cyan
Start-Sleep 5

# Test backend
$backendWorking = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Backend is running and healthy!" -ForegroundColor Green
            $backendWorking = $true
            break
        }
    } catch {
        Write-Host "   ⏳ Waiting for backend... (attempt $i/10)" -ForegroundColor Yellow
        Start-Sleep 2
    }
}

if (!$backendWorking) {
    Write-Host "   ❌ Backend failed to start!" -ForegroundColor Red
    Write-Host "   Please check for errors in the backend console." -ForegroundColor Red
    exit 1
}

# Start Caddy
Write-Host "2. Starting Caddy reverse proxy..." -ForegroundColor Blue
Set-Location backend
Start-Process -FilePath ".\caddy_windows_amd64.exe" -ArgumentList "run" -WindowStyle Minimized
Set-Location ..
Start-Sleep 3

# Start Cloudflare Tunnel
Write-Host "3. Starting Cloudflare tunnel..." -ForegroundColor Blue
Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel", "--config", "config.yml", "run" -WindowStyle Minimized
Start-Sleep 5

# Test the complete setup
Write-Host "🔍 Testing complete setup..." -ForegroundColor Cyan

# Test local backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Local backend: HEALTHY" -ForegroundColor Green
} catch {
    Write-Host "❌ Local backend: FAILED" -ForegroundColor Red
}

# Test through Caddy
try {
    $response = Invoke-WebRequest -Uri "http://localhost:80/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Caddy proxy: WORKING" -ForegroundColor Green
} catch {
    Write-Host "❌ Caddy proxy: FAILED" -ForegroundColor Red
}

# Test public API
try {
    $headers = @{"Content-Type" = "application/json"}
    $response = Invoke-WebRequest -Uri "https://letstestit.me/api/auth/login" -Method POST -Headers $headers -Body '{"email":"test","password":"test"}' -UseBasicParsing -ErrorAction Stop
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400 -or $statusCode -eq 401) {
        Write-Host "✅ Public API: WORKING (authentication error is expected)" -ForegroundColor Green
    } else {
        Write-Host "❌ Public API: Status $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "🌐 Website: https://letstestit.me" -ForegroundColor Cyan
Write-Host "📡 API: https://letstestit.me/api/" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Keep this PowerShell window open!" -ForegroundColor Yellow
Write-Host "   If you close it, the backend will stop working." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor White
Read-Host