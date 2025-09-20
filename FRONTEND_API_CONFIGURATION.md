# Frontend API Configuration Guide

## 🌐 Making Your Website API Work with Remote Access

Your frontend has been configured to use your domain (`letstestit.me`) instead of localhost, enabling laptops and devices outside your local network to access the website properly.

## ✅ Changes Made

### 1. Updated Environment Configuration
- **Updated**: `.env` to use `https://letstestit.me/api`
- **Created**: `.env.production` for production builds
- **Created**: `.env.local` for local development (if needed)

### 2. Enhanced Vite Configuration
- **Added**: Better environment handling and CORS support
- **Enhanced**: Development server configuration for remote access
- **Added**: Production build optimizations

### 3. Updated Build Scripts
- **Added**: Environment-specific build commands
- **Enhanced**: Development and preview server options
- **Added**: Deployment-ready build process

## 📁 Environment Files

### `.env` (Main Configuration)
```env
# Frontend API Configuration
# Use your public domain for remote access from other devices
VITE_API_URL=https://letstestit.me/api

# For local development only (uncomment if needed):
# VITE_API_URL=http://localhost:3001/api
```

### `.env.production` (Production Builds)
```env
# Production Environment Configuration
VITE_API_URL=https://letstestit.me/api
NODE_ENV=production
```

### `.env.local` (Local Development - Optional)
```env
# For local development (backend running on localhost)
VITE_API_URL=http://localhost:3001/api
NODE_ENV=development
```

## 🚀 How to Use

### Option 1: Production Mode (Recommended for Remote Access)
Your website will now connect to your public API, allowing access from any device:

```bash
# Build and deploy for remote access
npm run build
manage.bat start
```

**Result**: Website accessible at `https://letstestit.me` from anywhere

### Option 2: Development Mode (Domain API)
For development while still using the public API:

```bash
# Development with public API
npm run dev
```

**Result**: Development server accessible with public API

### Option 3: Local Development Mode (If Needed)
Only if you need to develop with a local backend:

```bash
# Use local backend for development
npm run dev:local
```

**Result**: Uses `localhost:3001` for API calls

## 🛠️ Build Commands

### Production Build:
```bash
npm run build          # Build for production (uses .env.production)
npm run deploy         # Build and show deployment message
```

### Development Build:
```bash
npm run build:dev      # Build in development mode
npm run dev            # Start development server
npm run dev:local      # Start development server with localhost API
```

### Preview:
```bash
npm run preview        # Preview production build locally
npm run start          # Build and preview in one command
```

## 🔧 Testing the Configuration

### Test 1: Local Access
```bash
# Start your services
manage.bat start

# Visit in browser
# https://letstestit.me
```

### Test 2: Remote Device Access
1. **Find your computer's IP**: Use `ipconfig` to get your local IP
2. **On another device**: Visit `https://letstestit.me`
3. **The website should work**: API calls will go to your domain

### Test 3: API Endpoint Testing
```bash
# Test the API directly
curl https://letstestit.me/api/health
```

## 🌟 Architecture Overview

### Before (Localhost Only):
```
Remote Device → ❌ Can't access localhost API
Frontend (Browser) → localhost:3001/api → Backend
```

### After (Domain API):
```
Remote Device → ✅ Can access via domain
Frontend (Browser) → letstestit.me/api → Cloudflare → Caddy → Backend
```

## 📊 Environment Variables Explained

| Variable | Purpose | Values |
|----------|---------|---------|
| `VITE_API_URL` | API endpoint URL | `https://letstestit.me/api` or `http://localhost:3001/api` |
| `NODE_ENV` | Environment mode | `development`, `production` |

## 🚨 Troubleshooting

### Problem: API calls still going to localhost
**Solution**:
1. Check your `.env` file has the correct `VITE_API_URL`
2. Restart development server: `npm run dev`
3. Clear browser cache and refresh

### Problem: CORS errors on remote devices
**Solution**:
1. Ensure backend CORS is configured for your domain
2. Check that `CORS_ORIGINS` in `backend/.env` includes your domain
3. Restart backend: `manage.bat restart`

### Problem: Website loads but API fails
**Solution**:
1. Test API directly: `curl https://letstestit.me/api/health`
2. Check that all services are running: `manage.bat status`
3. Check backend and Caddy logs: `manage.bat logs backend`

### Problem: Mixed content errors (HTTP/HTTPS)
**Solution**:
1. Ensure all API calls use HTTPS (`https://letstestit.me/api`)
2. Check that your domain has SSL certificate
3. Verify Cloudflare tunnel is working

## 🔄 Switching Between Configurations

### To Use Domain API (Remote Access):
1. Ensure `.env` has `VITE_API_URL=https://letstestit.me/api`
2. Run `npm run build` or `npm run dev`
3. Start services: `manage.bat start`

### To Use Localhost API (Local Development):
1. Update `.env` to `VITE_API_URL=http://localhost:3001/api`
2. Or use: `npm run dev:local`
3. Start backend locally: `cd backend && npm run dev`

## ✅ Verification Checklist

- [ ] `.env` file updated with domain API URL
- [ ] Frontend builds successfully: `npm run build`
- [ ] API health check works: `curl https://letstestit.me/api/health`
- [ ] Website loads on remote device
- [ ] Login/authentication works from remote device
- [ ] All features work from external access

## 🎯 Quick Commands Summary

```bash
# Complete setup for remote access
manage.bat build     # Build everything
manage.bat start     # Start all services
manage.bat status    # Check if working
manage.bat health    # Test connectivity

# Frontend only
npm run build        # Build for production
npm run dev          # Development with domain API
npm run preview      # Preview production build
```

---

**Your frontend is now configured for remote access! 🎉**

External devices can now access your website at `https://letstestit.me` and all API calls will work properly through your domain instead of trying to connect to localhost.