# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Elis** (Library Volunteer Hub) is a full-stack React + Node.js application for managing library volunteer schedules, tasks, and hours tracking. The system has role-based access control with Librarians and Volunteers having different capabilities.

## Architecture

### Frontend Architecture
- **React 19** with TypeScript and Vite
- **Context-based state management** with three main contexts:
  - `AuthContext` - User authentication and current user state
  - `ThemeContext` - Theme management with custom colors and system/light/dark modes
  - `NotificationsContext` - Real-time notifications via Server-Sent Events (SSE)
- **Component structure**:
  - `Layout.tsx` - Main layout with responsive sidebar navigation
  - Role-specific dashboards (`LibrarianDashboard`, `VolunteerDashboard`)
  - Modular UI components in `components/` directory
  - API service layer with automatic retry logic and exponential backoff

### Backend Architecture
- **Node.js + Express** with TypeScript
- **PostgreSQL** database with **Prisma ORM**
- **JWT-based authentication** with role-based access control
- **Modular route structure** in `backend/src/routes/`:
  - `auth.ts` - Login, register, token verification
  - `users.ts` - User management with audit logging
  - `tasks.ts` - Task assignment and status tracking
  - `shifts.ts` - Schedule management
  - `volunteerLogs.ts` - Hour tracking with check-in codes
  - `magazines.ts` - Magazine check-in tracking
  - `announcements.ts` - Communication system
  - `notifications.ts` - Real-time SSE notifications
  - `audit.ts` - Audit log viewing
- **Security features**: bcrypt password hashing, rate limiting, CORS protection, Helmet security headers

### Database Schema (Prisma)
Key entities include Users, Shifts, Tasks, VolunteerLogs, Magazines, Announcements, and AuditLogs with proper relationships and constraints.

## Development Commands

### Initial Setup
```bash
# Windows setup (run from project root)
setup-backend.bat

# Or manual setup:
cd backend
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### Frontend Development
```bash
# Install dependencies
npm install

# Start frontend dev server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development
```bash
# Start backend dev server (localhost:3001)
npm run backend:dev

# Build backend
npm run backend:build

# Start production backend
npm run backend:start

# Combined frontend + backend dev
npm run dev & npm run backend:dev
```

### Database Operations
```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Run database migrations
npm run db:migrate

# Open Prisma Studio GUI
npm run db:studio

# Seed database with sample data
npm run db:seed
```

### Testing API
```bash
# Test API endpoints
npm run test-api
```

### Deployment Commands
```bash
# Start Cloudflare tunnel (run from project root)
.\cloudflared.exe tunnel run

# Start Caddy reverse proxy (run from backend directory)
cd backend
.\caddy_windows_amd64.exe run

# Build and deploy full stack
npm run build
npm run backend:build
npm run backend:start
```

## Key Development Patterns

### Authentication Flow
- Frontend stores JWT in localStorage
- API service automatically includes Bearer token in requests
- Context provides user state and login/logout methods
- Role-based navigation and permissions

### State Management Pattern
```typescript
// Context providers wrap the app root
<AuthContext.Provider>
  <ThemeProvider>
    <NotificationsProvider>
      {/* App components */}
    </NotificationsProvider>
  </ThemeProvider>
</AuthContext.Provider>
```

### API Service Pattern
- Centralized `apiService.ts` with retry logic and error handling
- Methods mirror backend endpoints
- Automatic token management

### Real-time Updates
- Server-Sent Events (SSE) for notifications
- Role change detection and UI updates
- Admin broadcast capabilities

## Deployment & Hosting

The application is self-hosted using **Cloudflare Tunnel** for secure public access:
- **Production URL**: https://letstestit.me
- **Cloudflare executable**: `cloudflared.exe` (included in project root)
- **Reverse proxy**: Caddy server (`caddy_windows_amd64.exe` in backend directory)
- **Configuration**: `backend/Caddyfile` handles routing and HTTPS

### Deployment Architecture
```
Internet → Cloudflare Tunnel → Caddy Reverse Proxy → Frontend (Vite) + Backend (Node.js)
```

## Environment Configuration

### Frontend (.env)
```bash
# Development
VITE_API_URL=http://localhost:3001/api

# Production (via Cloudflare tunnel)
VITE_API_URL=https://letstestit.me/api
```

### Backend (.env)
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/library_volunteer_hub"
JWT_SECRET="your-jwt-secret"
PORT=3001
NODE_ENV="development"
ADMIN_EMAIL="admin@school.edu"
```

## Default Login Credentials
- **Librarian**: admin@school.edu / password123
- **Volunteer**: ben@student.school.edu / password123
- **Volunteer**: chloe@student.school.edu / password123

## Common Development Tasks

### Adding New API Endpoints
1. Define route in `backend/src/routes/`
2. Add corresponding method in `services/apiService.ts`
3. Update TypeScript types in `types.ts`
4. Implement frontend components/hooks

### Database Schema Changes
1. Modify `backend/prisma/schema.prisma`
2. Run `npm run db:generate` in backend
3. Run `npm run db:push` or create migration with `npm run db:migrate`
4. Update TypeScript types and API methods

### Adding New UI Components
- Follow existing context patterns for state management
- Use Theme context for consistent styling
- Implement responsive design with Tailwind classes
- Add proper TypeScript interfaces

### Deployment & Infrastructure
- **Cloudflare Tunnel**: Provides secure public access without port forwarding
- **Caddy Server**: Acts as reverse proxy, handles HTTPS and routing
- **Self-hosted**: Runs on local machine with public domain access
- Configuration files: `backend/Caddyfile` for routing, Cloudflare dashboard for tunnel management

## Error Handling Patterns
- API service includes automatic retry with exponential backoff
- Frontend displays user-friendly error messages
- Backend includes comprehensive error logging
- Audit logging for sensitive operations

## Security Considerations
- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire in 24 hours
- Admin account cannot be deleted/demoted
- Rate limiting on API endpoints
- CORS and security headers via Helmet