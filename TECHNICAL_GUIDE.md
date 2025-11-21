# Technical Guide

This document provides a deep dive into the technical architecture of the Library Monitor Hub.

## 🏗️ Architecture Overview

The application follows a modern full-stack architecture:

- **Frontend**: React 19 (Vite) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Infrastructure**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (handles HTTPS and routing)
- **Remote Access**: Cloudflare Tunnel

### "Self-Dependable" Design
The application is designed to be fully self-contained using Docker.
- **Portability**: The entire stack (App, DB, Web Server) runs in containers. No local dependencies (Node, Postgres) are required on the host machine.
- **Persistence**: Database data is stored in a Docker Volume (`postgres_data`), ensuring data survives container restarts.

---

## 📂 Directory Structure

- **`/backend`**: Node.js API source code.
  - `src/routes`: API endpoints.
  - `src/services`: Business logic.
  - `prisma/schema.prisma`: Database schema definition.
- **`/src`** (Root): React Frontend source code.
  - `components`: Reusable UI components.
  - `pages`: Application pages.
  - `context`: Global state (Auth, Theme).
- **`/docker`**: Configuration for Docker services (Caddyfile, Tunnel).
- **`/scripts`**: Database management utilities.

---

## 🗄️ Database Schema

The database is managed via **Prisma**. Key models include:

- **User**: Stores login info and roles (`LIBRARIAN`, `MONITOR`).
- **Shift**: Represents a time slot on the schedule.
- **ShiftAssignment**: Links a User to a Shift.
- **Task**: Tasks to be done.
- **MonitorLog**: Records of check-in/check-out times.

To modify the schema:
1.  Edit `backend/prisma/schema.prisma`.
2.  Run `npm run db:migrate` (in development) or rebuild the Docker container.

---

## 🐳 Docker Configuration

### `docker-compose.yml`
Orchestrates the services:
1.  **`frontend`**: Builds the React app and serves it using Caddy.
    - *Internal Port*: 80
2.  **`backend`**: Runs the Node.js API.
    - *Internal Port*: 3001
3.  **`db`**: PostgreSQL database.
    - *Internal Port*: 5432
4.  **`tunnel`**: Cloudflare Tunnel for public access.

### Networking
All services communicate via the internal `app-network`.
- The Frontend (Caddy) proxies `/api/*` requests to `http://backend:3001`.
- The Backend connects to `postgres://.../db:5432`.

---

## 🔧 Development

### Running Locally (Without Docker)
For active development, you can run the services individually:
1.  **Backend**: `cd backend && npm install && npm run dev`
2.  **Frontend**: `npm install && npm run dev`
3.  **Database**: You must have a local Postgres instance running.

### Running with Docker (Recommended for Production)
Simply run:
```bash
start-docker.bat
```
This builds the images and starts the containers in detached mode.
