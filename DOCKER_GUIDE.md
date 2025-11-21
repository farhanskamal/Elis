# Docker Guide

This guide explains how to run and manage the Library Monitor Hub using Docker.

## 📥 Installation

### 1. Install Docker
You need **Docker Desktop** (for Windows/Mac) or **Docker Engine** (for Linux).
- [Download Docker Desktop](https://www.docker.com/products/docker-desktop)

### 2. Start the Application
We have provided a simple script to get everything running.

**Windows:**
Double-click `start-docker.bat` in the project folder.

**Linux/Mac:**
Run the following command in the terminal:
```bash
docker-compose up -d --build
```

The first time you run this, it may take a few minutes to download and build everything.

---

## 🌐 Remote Access (Cloudflare Tunnel)

To access the application from outside your network (e.g., `https://letstestit.me`), you need a Cloudflare Tunnel Token.

1.  Get your Tunnel Token from the Cloudflare Zero Trust Dashboard.
2.  When running `start-docker.bat`, it will ask for this token.
3.  Paste it in, and the script will save it to your configuration.

Alternatively, you can manually add it to the `.env` file:
```
TUNNEL_TOKEN=eyJhIjoi...
```

---

## 💾 Database Management

We provide scripts to easily backup and restore your data.

### 📤 Export (Backup)
Run `scripts/db-export.bat`.
- This will create a SQL file (e.g., `backup_20231121.sql`) in the project folder.
- Keep this file safe! It contains all your user data and logs.

### 📥 Import (Restore)
Run `scripts/db-import.bat`.
- You will be asked to enter the filename of the backup you want to restore.
- **WARNING**: This will overwrite the current database with the backup data.

---

## 🛠️ Troubleshooting

### "Docker is not running"
Make sure you have started Docker Desktop and the whale icon is visible in your taskbar.

### "Port already in use"
If port 80 or 3001 is taken by another application, you may need to stop that application or change the ports in `docker-compose.yml`.

### Viewing Logs
To see what's happening inside the application, you can view the logs:
```bash
# View all logs
docker-compose logs -f

# View only backend logs
docker-compose logs -f backend
```

### Stopping the App
To stop all services:
```bash
docker-compose down
```
