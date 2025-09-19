# Remote Access Configuration Guide

## 🌐 Backend Remote Access Setup

Your backend server has been configured to accept connections from remote locations. Here's what was changed and how to use it:

## ✅ Changes Made

### 1. Server Binding Configuration
- **Updated**: `backend/src/index.ts` to bind to `0.0.0.0` (all network interfaces)
- **Added**: `HOST` environment variable for flexible configuration
- **Default**: Server now accepts connections from any IP address

### 2. Environment Configuration
- **Added**: `HOST="0.0.0.0"` to your `.env` file
- **Options**: 
  - `0.0.0.0` = Accept connections from anywhere (remote access)
  - `127.0.0.1` = Accept connections only from localhost (secure)

### 3. Reverse Proxy Enhancement
- **Updated**: Caddyfile with proper headers for remote connections
- **Added**: Real IP forwarding and host header preservation

## 🚀 How to Use

### Option 1: Using Your Current Setup (Recommended)
Your current setup with Cloudflare Tunnel + Caddy is already configured for remote access:

```bash
# Start all services (your existing workflow)
manage.bat start
```

**Access your app**:
- **Public URL**: https://letstestit.me
- **Backend API**: https://letstestit.me/api/

### Option 2: Direct Backend Access (If Needed)
If you need direct access to the backend (bypassing Caddy):

```bash
# Your backend will be available at:
# http://YOUR_PUBLIC_IP:3001
# http://localhost:3001 (local only)
```

## 🔒 Windows Firewall Configuration

If you want **direct access** to port 3001 from remote locations:

### Method 1: Using Windows Firewall GUI
1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → **Next**
4. Choose **TCP** → Enter **3001** → **Next**
5. Select **Allow the connection** → **Next**
6. Check all network types → **Next**
7. Name it "Library Hub Backend" → **Finish**

### Method 2: Using Command Line (Run as Administrator)
```powershell
# Allow inbound connections on port 3001
netsh advfirewall firewall add rule name="Library Hub Backend" dir=in action=allow protocol=TCP localport=3001

# Allow outbound connections (usually not needed)
netsh advfirewall firewall add rule name="Library Hub Backend Out" dir=out action=allow protocol=TCP localport=3001
```

### Method 3: Using PowerShell (Run as Administrator)
```powershell
# Create firewall rule
New-NetFirewallRule -DisplayName "Library Hub Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

## 🔧 Configuration Options

### Secure Mode (Localhost Only)
```env
# In backend/.env
HOST="127.0.0.1"
```

### Remote Access Mode (All Interfaces)
```env
# In backend/.env  
HOST="0.0.0.0"
```

### Specific Interface Only
```env
# In backend/.env (replace with your actual IP)
HOST="192.168.1.100"
```

## 🔍 Testing Remote Access

### Test 1: Local Access
```bash
curl http://localhost:3001/health
```

### Test 2: Network Access (from another device)
```bash
# Replace YOUR_IP with your computer's IP address
curl http://YOUR_IP:3001/health
```

### Test 3: Public Access (through Cloudflare)
```bash
curl https://letstestit.me/api/health
```

## 📊 Finding Your IP Address

### Internal Network IP:
```powershell
ipconfig | findstr "IPv4"
```

### Public IP:
```powershell
curl https://ipinfo.io/ip
```

## ⚡ Quick Start Commands

### Start with Remote Access:
```bash
# This will start all services with remote access enabled
manage.bat start
```

### Check if Remote Access is Working:
```bash
# Check service status
manage.bat status

# Check health endpoint
manage.bat health
```

### View Backend Logs:
```bash
manage.bat logs backend
```

## 🛡️ Security Considerations

### Recommended Setup (Most Secure):
- ✅ Use Cloudflare Tunnel (current setup)
- ✅ Keep Caddy as reverse proxy
- ✅ Backend binds to `0.0.0.0` but only accessible through Caddy
- ✅ No direct firewall rules needed

### Direct Access Setup (Less Secure):
- ⚠️ Backend directly accessible on port 3001
- ⚠️ Requires firewall configuration
- ⚠️ Consider using VPN or IP restrictions

## 🌟 Your Current Architecture

```
Internet → Cloudflare Tunnel → Caddy (Port 80) → Backend (Port 3001)
                              ↓
                         Static Files (dist/)
```

This setup is ideal because:
- ✅ Backend not directly exposed to internet
- ✅ SSL termination handled by Cloudflare
- ✅ Static files served efficiently by Caddy
- ✅ API requests proxied to backend
- ✅ Automatic CORS handling

## 🚨 Troubleshooting

### Problem: Cannot access from remote location
**Solution**: 
1. Check `HOST` setting in `.env`
2. Restart backend: `manage.bat restart`
3. Verify firewall rules (if using direct access)

### Problem: CORS errors
**Solution**: 
1. Check `CORS_ORIGINS` in `.env`
2. Verify Caddyfile CORS headers
3. Test with your actual domain

### Problem: Connection refused
**Solution**:
1. Check if backend is running: `manage.bat status`
2. Test local access first: `curl http://localhost:3001/health`
3. Check network connectivity

## 📝 Support

If you encounter issues:
1. Run `manage.bat health` to check system status
2. Check logs with `manage.bat logs backend`
3. Verify your firewall settings
4. Test each component individually

---

**Your backend is now configured for remote access! 🎉**