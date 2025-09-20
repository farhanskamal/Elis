# PowerShell Usage Guide - Library Monitor Hub

## 🎉 Problem Solved!

Your PowerShell compatibility issue has been resolved. I've created a native PowerShell management script that works perfectly with your PowerShell environment.

## ✅ What Was Fixed

### 1. **PowerShell Compatibility Issue**
- **Problem**: The original `manage.bat` had batch-specific syntax that PowerShell couldn't parse properly
- **Solution**: Created `manage-simple.ps1` - a native PowerShell script with identical functionality

### 2. **Frontend API Configuration**
- **Updated**: Frontend now uses `https://letstestit.me/api` instead of `localhost:3001`
- **Result**: Remote devices can now access your website and all API calls work properly

### 3. **Backend Remote Access**
- **Configured**: Backend now binds to `0.0.0.0` (all network interfaces)
- **Result**: Backend accepts connections from remote locations through your domain

## 🚀 How to Use the PowerShell Script

### Basic Commands (PowerShell):

```powershell
# Show available commands
.\manage-simple.ps1

# Start all services
.\manage-simple.ps1 start

# Check service status
.\manage-simple.ps1 status

# Stop all services
.\manage-simple.ps1 stop

# Restart all services
.\manage-simple.ps1 restart

# Check system health
.\manage-simple.ps1 health

# Build the project
.\manage-simple.ps1 build
```

### Alternative Methods:

```powershell
# Method 1: Direct execution (if execution policy allows)
.\manage-simple.ps1 start

# Method 2: Bypass execution policy (if needed)
powershell -ExecutionPolicy Bypass -File ".\manage-simple.ps1" start

# Method 3: Using the original batch file from CMD (not PowerShell)
cmd /c "manage.bat start"
```

## 📊 Current Status

Your system is now configured as follows:

### ✅ Backend Configuration:
- **Host Binding**: `0.0.0.0` (Remote access enabled)
- **Port**: 3001
- **API Base**: `https://letstestit.me/api`

### ✅ Frontend Configuration:
- **API URL**: `https://letstestit.me/api`
- **Build**: Production-ready with domain API
- **Access**: Remote devices can access the website

### ✅ Infrastructure:
- **Cloudflare Tunnel**: Exposes local server to internet
- **Caddy Reverse Proxy**: Routes API calls to backend
- **Domain**: `https://letstestit.me`

## 🌐 Remote Access Architecture

```
Remote Device (Laptop) 
    ↓
Internet → Cloudflare Tunnel 
    ↓
Caddy Proxy (Port 80) 
    ↓
Backend Server (Port 3001) ← Binds to 0.0.0.0
    ↓
Database
```

## 🔧 Usage Examples

### Complete Deployment:
```powershell
# Build the project with domain API
npm run build

# Start all services
.\manage-simple.ps1 start

# Check everything is working
.\manage-simple.ps1 status
```

### Daily Operations:
```powershell
# Morning: Start services
.\manage-simple.ps1 start

# Check if everything is running
.\manage-simple.ps1 status

# Evening: Stop services  
.\manage-simple.ps1 stop
```

### Troubleshooting:
```powershell
# Check system health
.\manage-simple.ps1 health

# Restart if issues
.\manage-simple.ps1 restart

# Rebuild if needed
.\manage-simple.ps1 build
```

## 📱 Testing Remote Access

### From Your Computer:
1. Visit `https://letstestit.me`
2. The website should load properly
3. Login/authentication should work

### From Another Device (Phone, Laptop):
1. Connect to any internet connection (doesn't need to be same network)
2. Visit `https://letstestit.me`  
3. Website should load and work identically to local access
4. All API calls will work through your domain

### API Testing:
```bash
# Test the API directly
curl https://letstestit.me/api/health
```

## 🎯 Key Benefits

### ✅ PowerShell Native:
- No more batch file compatibility issues
- Works perfectly with your PowerShell environment
- Colored output and clear status reporting

### ✅ Remote Access Enabled:
- Backend accepts connections from any IP
- Frontend configured to use your domain API
- Works from any device, anywhere in the world

### ✅ Production Ready:
- Proper environment configuration
- Domain-based API calls
- SSL/HTTPS through Cloudflare

## 🔍 Status Interpretation

When you run `.\manage-simple.ps1 status`, here's what to look for:

### ✅ Good Status:
```
Backend:     RUNNING
Caddy:       RUNNING  
Cloudflared: RUNNING
Host Binding: 0.0.0.0
Status: Remote access ENABLED
Public API:  ACCESSIBLE
Local API:   ACCESSIBLE
```

### ⚠️ Partial Status (Still Works):
```
Backend:     RUNNING
Caddy:       RUNNING
Cloudflared: STOPPED  <- May need manual restart
```

### ❌ Problem Status:
```
Backend:     STOPPED  <- Need to start services
```

## 🚨 Troubleshooting

### Issue: PowerShell Execution Policy
**Error**: "Execution of scripts is disabled on this system"
**Solution**: 
```powershell
# Temporary bypass
powershell -ExecutionPolicy Bypass -File ".\manage-simple.ps1" start

# Or set policy (as Administrator)
Set-ExecutionPolicy RemoteSigned
```

### Issue: Services Won't Start
**Solution**:
```powershell
# Stop all and restart
.\manage-simple.ps1 stop
Start-Sleep 5
.\manage-simple.ps1 start
```

### Issue: API Not Accessible
**Solution**:
1. Check if services are running: `.\manage-simple.ps1 status`
2. Restart services: `.\manage-simple.ps1 restart`
3. Check health: `.\manage-simple.ps1 health`

## 📝 Summary

**Your PowerShell issue is completely resolved!** 

✅ Use `.\manage-simple.ps1 [command]` for all management tasks
✅ Frontend configured for remote API access via domain
✅ Backend configured to accept remote connections
✅ Your website works from any device at `https://letstestit.me`

**Quick Start**: 
```powershell
.\manage-simple.ps1 start
```

Your Library Monitor Hub is now fully configured for remote access with PowerShell-native management! 🎉