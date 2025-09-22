# Library Monitor Hub Management Script (PowerShell)
# Run with: .\manage.ps1 [command]

param(
    [string]$Command = "",
    [string]$Option = "",
    [string]$Reason = ""
)

# Colors for output
$Colors = @{
    Red = [Console]::ForegroundColor = 'Red'
    Green = [Console]::ForegroundColor = 'Green'
    Yellow = [Console]::ForegroundColor = 'Yellow'
    Blue = [Console]::ForegroundColor = 'Blue'
    Cyan = [Console]::ForegroundColor = 'Cyan'
    White = [Console]::ForegroundColor = 'White'
    Reset = [Console]::ResetColor()
}

function Write-ColoredText {
    param([string]$Text, [string]$Color = "White")
    $originalColor = $Host.UI.RawUI.ForegroundColor
    switch ($Color) {
        "Red" { $Host.UI.RawUI.ForegroundColor = "Red" }
        "Green" { $Host.UI.RawUI.ForegroundColor = "Green" }
        "Yellow" { $Host.UI.RawUI.ForegroundColor = "Yellow" }
        "Blue" { $Host.UI.RawUI.ForegroundColor = "Blue" }
        "Cyan" { $Host.UI.RawUI.ForegroundColor = "Cyan" }
        "Magenta" { $Host.UI.RawUI.ForegroundColor = "Magenta" }
        default { $Host.UI.RawUI.ForegroundColor = "White" }
    }
    Write-Host $Text
    $Host.UI.RawUI.ForegroundColor = $originalColor
}

# Directory paths
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$MaintenanceDir = Join-Path $ProjectRoot "maintenance"
$PidsDir = Join-Path $ProjectRoot "pids"
$LogsDir = Join-Path $ProjectRoot "logs"

# Create necessary directories
if (!(Test-Path $PidsDir)) { New-Item -ItemType Directory -Path $PidsDir -Force | Out-Null }
if (!(Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null }

# Header
Write-ColoredText "======================================" "Cyan"
Write-ColoredText "   Library Monitor Hub Manager      " "Cyan"
Write-ColoredText "======================================" "Cyan"
Write-Host ""

function Show-Menu {
    Write-ColoredText "Available commands:" "White"
    Write-ColoredText "  start       - Start all services (backend, caddy, cloudflared)" "Green"
    Write-ColoredText "  stop        - Stop all services" "Red"
    Write-ColoredText "  restart     - Restart all services" "Yellow"
    Write-ColoredText "  status      - Show service status" "Blue"
    Write-ColoredText "  maintenance - Enable/disable maintenance mode" "Magenta"
    Write-ColoredText "  build       - Build the project" "Cyan"
    Write-ColoredText "  logs        - Show service logs" "White"
    Write-ColoredText "  health      - Check system health" "Green"
    Write-ColoredText "  help        - Show this help" "White"
    Write-Host ""
    Write-ColoredText "Usage: .\manage.ps1 [command] [options]" "Yellow"
    Write-Host ""
}

function Get-ServiceStatus {
    $status = @{
        Backend = $false
        Caddy = $false
        Cloudflared = $false
    }
    
    # Check if processes are running
    if (Get-Process -Name "node" -ErrorAction SilentlyContinue) {
        $status.Backend = $true
    }
    
    if (Get-Process -Name "caddy_windows_amd64" -ErrorAction SilentlyContinue) {
        $status.Caddy = $true
    }
    
    if (Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue) {
        $status.Cloudflared = $true
    }
    
    return $status
}

function Get-HostConfiguration {
    $envFile = Join-Path $BackendDir ".env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile
        $hostLine = $content | Where-Object { $_ -match '^HOST=' }
        if ($hostLine) {
            $hostValue = ($hostLine -split '=')[1] -replace '"', ''
            return $hostValue
        }
    }
    return "0.0.0.0"
}

function Show-Status {
    $status = Get-ServiceStatus
    
    Write-ColoredText "📊 Service Status:" "White"
    Write-Host ""
    
    if ($status.Backend) {
        Write-ColoredText "  Backend:     🟢 Running" "Green"
    } else {
        Write-ColoredText "  Backend:     🔴 Stopped" "Red"
    }
    
    if ($status.Caddy) {
        Write-ColoredText "  Caddy:       🟢 Running" "Green"
    } else {
        Write-ColoredText "  Caddy:       🔴 Stopped" "Red"
    }
    
    if ($status.Cloudflared) {
        Write-ColoredText "  Cloudflared: 🟢 Running" "Green"
    } else {
        Write-ColoredText "  Cloudflared: 🔴 Stopped" "Red"
    }
    
    $maintenanceFile = Join-Path $MaintenanceDir "active"
    if (Test-Path $maintenanceFile) {
        Write-ColoredText "  Maintenance: 🟡 Enabled" "Yellow"
    } else {
        Write-ColoredText "  Maintenance: 🟢 Disabled" "Green"
    }
    
    Write-Host ""
    Write-ColoredText "🌐 Remote Access Configuration:" "Cyan"
    
    $hostConfig = Get-HostConfiguration
    switch ($hostConfig) {
        "0.0.0.0" {
            Write-ColoredText "  Host Binding: 🟢 All interfaces (Remote access enabled)" "Green"
        }
        "127.0.0.1" {
            Write-ColoredText "  Host Binding: 🟡 Localhost only" "Yellow"
        }
        default {
            Write-ColoredText "  Host Binding: 🌐 $hostConfig" "Cyan"
        }
    }
    
    Write-Host ""
    Write-ColoredText "🔍 Checking accessibility..." "Blue"
    
    # Test public API
    try {
        $response = Invoke-WebRequest -Uri "https://letstestit.me/api/health" -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-ColoredText "  Public API:  🟢 https://letstestit.me/api/" "Green"
        } else {
            Write-ColoredText "  Public API:  🔴 Not accessible" "Red"
        }
    } catch {
        Write-ColoredText "  Public API:  🔴 Not accessible" "Red"
    }
    
    # Test local backend
    Write-ColoredText "   Testing local backend..." "Blue"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-ColoredText "  Local API:   🟢 http://localhost:3001" "Green"
        } else {
            Write-ColoredText "  Local API:   🔴 Not responding" "Red"
        }
    } catch {
        Write-ColoredText "  Local API:   🔴 Not responding" "Red"
    }
    
    Write-Host ""
}

function Start-Caddy {
    $log = Join-Path $LogsDir "caddy.log"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c .\caddy_windows_amd64.exe run > `"$log`" 2>&1" -WindowStyle Minimized -WorkingDirectory $BackendDir
    Write-ColoredText "✅ Caddy started (logging to $log)" "Green"
}

function Stop-Caddy {
    Get-Process -Name "caddy_windows_amd64" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-ColoredText "✅ Caddy stopped" "Green"
}

function Restart-Caddy {
    Stop-Caddy
    Start-Sleep 2
    Start-Caddy
}

function Start-Cloudflared {
    $log = Join-Path $LogsDir "cloudflared.log"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c .\cloudflared.exe tunnel run > `"$log`" 2>&1" -WindowStyle Minimized -WorkingDirectory $ProjectRoot
    Start-Sleep 2
    Write-ColoredText "✅ Cloudflared started (logging to $log)" "Green"
}

function Stop-Cloudflared {
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-ColoredText "✅ Cloudflared stopped" "Green"
}

function Restart-Cloudflared {
    Stop-Cloudflared
    Start-Sleep 2
    Start-Cloudflared
}

function Start-Services {
    Write-ColoredText "🚀 Starting Library Monitor Hub services..." "Green"
    Write-Host ""
    
    # Check backend configuration
    Write-ColoredText "🔧 Checking backend configuration..." "Blue"
    $hostConfig = Get-HostConfiguration
    
    Write-ColoredText "   Host binding: $hostConfig" "Cyan"
    switch ($hostConfig) {
        "0.0.0.0" {
            Write-ColoredText "   ✅ Remote access enabled" "Green"
        }
        "127.0.0.1" {
            Write-ColoredText "   ⚠️  Localhost only mode" "Yellow"
        }
        default {
            Write-ColoredText "   🌐 Custom host: $hostConfig" "Cyan"
        }
    }
    Write-Host ""
    
    $status = Get-ServiceStatus
    
    # Start Backend
    if ($status.Backend) {
        Write-ColoredText "⚠️  Backend is already running" "Yellow"
    } else {
        Write-ColoredText "📡 Starting backend server..." "Blue"
        Push-Location $BackendDir
        Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Minimized
        Start-Sleep 2
        Pop-Location
        Write-ColoredText "✅ Backend started" "Green"
    }
    
    # Start Caddy
    if ($status.Caddy) {
        Write-ColoredText "⚠️  Caddy is already running" "Yellow"
    } else {
        Write-ColoredText "🌐 Starting Caddy reverse proxy..." "Blue"
        Start-Caddy
    }
    
    # Start Cloudflare Tunnel
    if ($status.Cloudflared) {
        Write-ColoredText "⚠️  Cloudflare tunnel is already running" "Yellow"
    } else {
        Write-ColoredText "☁️  Starting Cloudflare tunnel..." "Blue"
        Start-Cloudflared
    }
    
    Write-Host ""
    Write-ColoredText "🎉 All services started successfully!" "Green"
    Write-ColoredText "🌐 Website available at: https://letstestit.me" "Cyan"
    Write-ColoredText "📡 Backend API: https://letstestit.me/api/" "Blue"
    Write-ColoredText "📊 Health check: https://letstestit.me/api/health" "White"
    Write-Host ""
}

function Stop-Services {
    Write-ColoredText "🛑 Stopping Library Monitor Hub services..." "Red"
    Write-Host ""
    
    Write-ColoredText "📡 Stopping backend server..." "Red"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-ColoredText "🌐 Stopping Caddy server..." "Red"
    Get-Process -Name "caddy_windows_amd64" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-ColoredText "☁️  Stopping Cloudflare tunnel..." "Red"
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-Host ""
    Write-ColoredText "✅ All services stopped" "Green"
    Write-Host ""
}

function Restart-Services {
    Write-ColoredText "🔄 Restarting services..." "Yellow"
    Stop-Services
    Start-Sleep 3
    Start-Services
}

function Deploy-Project {
    Write-ColoredText "🚀 Deploy: build and run deploy.bat" "Cyan"
    Build-Project
    $deployBat = Join-Path $ProjectRoot "deploy.bat"
    if (Test-Path $deployBat) {
        & $deployBat
    } else {
        Write-ColoredText "deploy.bat not found" "Red"
    }
}

function Setup-Project {
    Write-ColoredText "🧰 Running setup (build + db seed)..." "Cyan"
    Build-Project
    Db-Command -Action "seed"
    Write-ColoredText "✅ Setup complete" "Green"
}

function Check-Health {
    Write-ColoredText "🏥 Checking system health..." "Green"
    Write-Host ""
    
    # Backend Configuration
    Write-ColoredText "🔧 Backend Configuration:" "Cyan"
    $envFile = Join-Path $BackendDir ".env"
    if (Test-Path $envFile) {
        $hostConfig = Get-HostConfiguration
        Write-Host "   Host: $hostConfig"
    } else {
        Write-ColoredText "   ❌ .env file missing!" "Red"
    }
    Write-Host ""
    
    # Test public API
    Write-ColoredText "🌐 Testing public API..." "Blue"
    try {
        $response = Invoke-WebRequest -Uri "https://letstestit.me/api/health" -Method Get -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-ColoredText "✅ Public API is healthy" "Green"
            Write-ColoredText "Response:" "Cyan"
            Write-Host $response.Content
        }
    } catch {
        Write-ColoredText "❌ Public API health check failed" "Red"
    }
    Write-Host ""
    
    # Test local backend
    Write-ColoredText "📡 Testing local backend..." "Blue"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-ColoredText "✅ Local backend is responding" "Green"
            Write-ColoredText "Response:" "Cyan"
            Write-Host $response.Content
        }
    } catch {
        Write-ColoredText "❌ Local backend is not responding" "Red"
    }
    Write-Host ""
}

function Db-Command {
    param([string]$Action = "push")
    Push-Location $BackendDir
    switch ($Action.ToLower()) {
        "push" { npm run db:push }
        "generate" { npm run db:generate }
        "seed" { npm run db:seed }
        default { Write-ColoredText "Unknown db action. Use: push | generate | seed" "Yellow" }
    }
    Pop-Location
}

function Dev-Backend {
    Push-Location $BackendDir
    Start-Process -FilePath "npm" -ArgumentList "run","dev" -WindowStyle Minimized
    Pop-Location
    Write-ColoredText "✅ Backend dev server started" "Green"
}

function Start-Backend {
    $log = Join-Path $LogsDir "backend.log"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start > `"$log`" 2>&1" -WindowStyle Minimized -WorkingDirectory $BackendDir
    Write-ColoredText "✅ Backend started (logging to $log)" "Green"
}

function Stop-Backend {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-ColoredText "✅ Backend stopped" "Green"
}

function Build-Project {
    Write-ColoredText "🏗️  Building Library Monitor Hub..." "Cyan"
    Write-Host ""
    
    Write-ColoredText "📦 Installing frontend dependencies..." "Blue"
    Push-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-ColoredText "❌ Frontend dependency installation failed!" "Red"
        Pop-Location
        return
    }
    
    Write-ColoredText "🏗️  Building frontend..." "Blue"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-ColoredText "❌ Frontend build failed!" "Red"
        Pop-Location
        return
    }
    Pop-Location
    
    Write-ColoredText "📦 Installing backend dependencies..." "Blue"
    Push-Location $BackendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-ColoredText "❌ Backend dependency installation failed!" "Red"
        Pop-Location
        return
    }
    
    Write-ColoredText "🏗️  Building backend..." "Blue"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-ColoredText "❌ Backend build failed!" "Red"
        Pop-Location
        return
    }
    
    Write-ColoredText "🗄️  Updating database..." "Blue"
    npm run db:generate
    npm run db:push
    Pop-Location
    
    Write-ColoredText "✅ Build completed successfully!" "Green"
}

# Main script logic
switch ($Command.ToLower()) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "status" { Show-Status }
    "health" { Check-Health }
    "build" { Build-Project }
    "db" { Db-Command -Action $Option }
    "dev" { Dev-Backend }
    "start-backend" { Start-Backend }
    "stop-backend" { Stop-Backend }
    "start-caddy" { Start-Caddy }
    "stop-caddy" { Stop-Caddy }
    "restart-caddy" { Restart-Caddy }
    "start-cloudflared" { Start-Cloudflared }
    "stop-cloudflared" { Stop-Cloudflared }
    "restart-cloudflared" { Restart-Cloudflared }
    "deploy" { Deploy-Project }
    "setup" { Setup-Project }
    "help" { Show-Menu }
    default { Show-Menu }
}

Write-Host ""
