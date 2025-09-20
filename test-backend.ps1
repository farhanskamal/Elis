# Test script to diagnose backend issues
Write-Host "Testing backend connectivity..." -ForegroundColor Green

# Test if backend is listening on port 3001
$portTest = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue

if ($portTest.TcpTestSucceeded) {
    Write-Host "✅ Backend is listening on port 3001" -ForegroundColor Green
    
    # Test actual API endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ Health endpoint responded: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Health endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test API auth endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test","password":"test"}' -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ Auth endpoint responded: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "⚠️ Auth endpoint responded with status: $statusCode" -ForegroundColor Yellow
        if ($statusCode -eq 400 -or $statusCode -eq 401) {
            Write-Host "✅ This is expected - backend is working!" -ForegroundColor Green
        }
    }
} else {
    Write-Host "❌ Backend is not listening on port 3001" -ForegroundColor Red
    Write-Host "Checking if any Node processes are running..." -ForegroundColor Yellow
    
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Node processes found:" -ForegroundColor Yellow
        $nodeProcesses | ForEach-Object { Write-Host "  PID: $($_.Id) - $($_.ProcessName)" }
    } else {
        Write-Host "❌ No Node processes running" -ForegroundColor Red
    }
}