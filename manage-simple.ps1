# Library Monitor Hub Management Script (PowerShell - Simple Version)
# Run with: .\manage-simple.ps1 [command]

param([string]$Command = "")

function Write-ColorText($text, $color = "White") {
    $oldColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $color
    Write-Host $text
    $Host.UI.RawUI.ForegroundColor = $oldColor
}

# Paths
$BackendDir = Join-Path $PSScriptRoot "backend"

Write-ColorText "======================================" "Cyan"
Write-ColorText "   Library Monitor Hub Manager      " "Cyan"
Write-ColorText "======================================" "Cyan"
Write-Host ""

function Get-ServiceStatus {
    $backend = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $caddy = Get-Process -Name "caddy_windows_amd64" -ErrorAction SilentlyContinue
    $cloudflared = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    
    return @{
        Backend = $backend -ne $null
        Caddy = $caddy -ne $null
        Cloudflared = $cloudflared -ne $null
    }
}

function Get-HostConfig {
    $envFile = Join-Path $BackendDir ".env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile | Where-Object { $_ -match "^HOST=" }
        if ($content) {
            return ($content -split "=")[1] -replace '"', ''
        }
    }
    return "0.0.0.0"
}

function Show-Status {
    $status = Get-ServiceStatus
    
    Write-ColorText "Service Status:" "Yellow"
    if ($status.Backend) {
        Write-ColorText "  Backend:     RUNNING" "Green"
    } else {
        Write-ColorText "  Backend:     STOPPED" "Red"
    }
    
    if ($status.Caddy) {
        Write-ColorText "  Caddy:       RUNNING" "Green"
    } else {
        Write-ColorText "  Caddy:       STOPPED" "Red"
    }
    
    if ($status.Cloudflared) {
        Write-ColorText "  Cloudflared: RUNNING" "Green"
    } else {
        Write-ColorText "  Cloudflared: STOPPED" "Red"
    }
    
    Write-Host ""
    Write-ColorText "Remote Access Configuration:" "Cyan"
    $hostConfig = Get-HostConfig
    Write-Host "  Host Binding: $hostConfig"
    
    if ($hostConfig -eq "0.0.0.0") {
        Write-ColorText "  Status: Remote access ENABLED" "Green"
    } elseif ($hostConfig -eq "127.0.0.1") {
        Write-ColorText "  Status: Localhost only" "Yellow"
    } else {
        Write-ColorText "  Status: Custom configuration" "Cyan"
    }
    
    Write-Host ""
    Write-ColorText "Testing connectivity..." "Blue"
    
    # Test public API
    try {
        $response = Invoke-WebRequest -Uri "https://letstestit.me/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-ColorText "  Public API:  ACCESSIBLE" "Green"
    } catch {
        Write-ColorText "  Public API:  NOT ACCESSIBLE" "Red"
    }
    
    # Test local API  
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-ColorText "  Local API:   ACCESSIBLE" "Green"
    } catch {
        Write-ColorText "  Local API:   NOT ACCESSIBLE" "Red"
    }
}

function Start-Services {
    Write-ColorText "Starting Library Monitor Hub services..." "Green"
    Write-Host ""
    
    $hostConfig = Get-HostConfig
    Write-ColorText "Backend Host Configuration: $hostConfig" "Cyan"
    Write-Host ""
    
    $status = Get-ServiceStatus
    
    # Start Backend
    if (!$status.Backend) {
        Write-ColorText "Starting backend server..." "Blue"
        Set-Location $BackendDir
        # Use dev mode for better stability
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Minimized
        Start-Sleep 3
        Set-Location $PSScriptRoot
        Write-ColorText "Backend started (dev mode)" "Green"
    } else {
        Write-ColorText "Backend already running" "Yellow"
    }
    
    # Start Caddy
    if (!$status.Caddy) {
        Write-ColorText "Starting Caddy reverse proxy..." "Blue"
        Set-Location $BackendDir
        Start-Process -FilePath "./caddy_windows_amd64.exe" -ArgumentList "run" -WindowStyle Minimized
        Start-Sleep 2
        Set-Location $PSScriptRoot
        Write-ColorText "Caddy started" "Green"
    } else {
        Write-ColorText "Caddy already running" "Yellow"
    }
    
    # Start Cloudflare
    if (!$status.Cloudflared) {
        Write-ColorText "Starting Cloudflare tunnel..." "Blue"
        # Use the configuration file to run the tunnel
        Start-Process -FilePath "./cloudflared.exe" -ArgumentList "tunnel", "--config", "config.yml", "run" -WindowStyle Minimized
        Start-Sleep 3
        Write-ColorText "Cloudflare tunnel started" "Green"
    } else {
        Write-ColorText "Cloudflare tunnel already running" "Yellow"
    }
    
    Write-Host ""
    Write-ColorText "All services started!" "Green"
    Write-ColorText "Website: https://letstestit.me" "Cyan"
    Write-ColorText "API: https://letstestit.me/api/" "Cyan"
}

function Stop-Services {
    Write-ColorText "Stopping services..." "Red"
    
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "caddy_windows_amd64" -ErrorAction SilentlyContinue | Stop-Process -Force  
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-ColorText "All services stopped" "Green"
}

function Restart-Services {
    Write-ColorText "Restarting services..." "Yellow"
    Stop-Services
    Start-Sleep 3
    Start-Services
}

function Build-Project {
    Write-ColorText "Building project..." "Cyan"
    
    Write-ColorText "Installing frontend dependencies..." "Blue"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "Frontend dependency installation failed!" "Red"
        return
    }
    
    Write-ColorText "Building frontend..." "Blue"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "Frontend build failed!" "Red"
        return
    }
    
    Write-ColorText "Installing backend dependencies..." "Blue"
    Set-Location $BackendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "Backend dependency installation failed!" "Red"
        Set-Location $PSScriptRoot
        return
    }
    
    Write-ColorText "Building backend..." "Blue"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "Backend build failed!" "Red"
        Set-Location $PSScriptRoot
        return
    }
    
    Write-ColorText "Updating database..." "Blue"
    npm run db:generate
    npm run db:push
    Set-Location $PSScriptRoot
    
    Write-ColorText "Build completed successfully!" "Green"
}

function Check-Health {
    Write-ColorText "Health Check Results:" "Green"
    Write-Host ""
    
    $hostConfig = Get-HostConfig
    Write-Host "Backend Host: $hostConfig"
    Write-Host ""
    
    Write-ColorText "Testing public API..." "Blue"
    try {
        $response = Invoke-WebRequest -Uri "https://letstestit.me/api/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-ColorText "Public API: HEALTHY" "Green"
        Write-Host $response.Content
    } catch {
        Write-ColorText "Public API: FAILED" "Red"
    }
    
    Write-Host ""
    Write-ColorText "Testing local backend..." "Blue"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-ColorText "Local Backend: HEALTHY" "Green"
        Write-Host $response.Content
    } catch {
        Write-ColorText "Local Backend: FAILED" "Red"
    }
}

function Show-Menu {
    Write-ColorText "Available commands:" "White"
    Write-Host "  start     - Start all services"
    Write-Host "  stop      - Stop all services"
    Write-Host "  restart   - Restart all services"  
    Write-Host "  status    - Show service status"
    Write-Host "  health    - Check system health"
    Write-Host "  build     - Build the project"
    Write-Host "  help      - Show this help"
    Write-Host ""
    Write-ColorText "Usage: .\manage-simple.ps1 [command]" "Yellow"
}

# Main logic
switch ($Command.ToLower()) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "status" { Show-Status }
    "health" { Check-Health }
    "build" { Build-Project }
    "help" { Show-Menu }
    default { Show-Menu }
}

Write-Host ""