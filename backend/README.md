# Library Monitor Hub - Backend

This is the backend API for the Library Monitor Hub application, built with Node.js, Express, TypeScript, and PostgreSQL with Prisma ORM.

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **User Management**: CRUD operations for librarians and monitors
- **Schedule Management**: Create and manage monitor shifts
- **Task Assignment**: Assign and track tasks for monitors
- **Hour Tracking**: Check-in/check-out system with codes
- **Magazine Tracking**: Log magazine check-ins by week
- **Announcements**: Communication system between librarians and monitors
- **Period Management**: Configure school period definitions

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/library_monitor_hub"
   JWT_SECRET="3233b202c4138755a7f6e15277ee8e6c4077c9b8d48b17db285d4a5c02042b90"
   PORT=3001
   NODE_ENV="development"
   ```

3. **Database Setup:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations
   npm run db:migrate
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users/monitors` - Get all monitors
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users` - Create user (librarian only)
- `DELETE /api/users/:id` - Delete user (librarian only)

### Shifts
- `GET /api/shifts/week/:startDate` - Get shifts for a week
- `POST /api/shifts` - Create shift (librarian only)
- `PUT /api/shifts/:id` - Update shift (librarian only)
- `DELETE /api/shifts/:id` - Delete shift (librarian only)

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/monitor/:monitorId` - Get tasks for monitor
- `POST /api/tasks` - Create task (librarian only)
- `PUT /api/tasks/:id` - Update task (librarian only)
- `PUT /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task (librarian only)

### Announcements
- `GET /api/announcements` - Get all announcements
- `GET /api/announcements/:id` - Get announcement by ID
- `POST /api/announcements` - Create announcement (librarian only)
- `PUT /api/announcements/:id` - Update announcement (librarian only)
- `DELETE /api/announcements/:id` - Delete announcement (librarian only)

### Magazines
- `GET /api/magazines` - Get all magazines
- `GET /api/magazines/logs` - Get magazine logs
- `POST /api/magazines` - Add magazine (librarian only)
- `DELETE /api/magazines/:id` - Remove magazine (librarian only)
- `POST /api/magazines/:id/log` - Log magazine check
- `DELETE /api/magazines/:id/log/:weekIdentifier` - Remove magazine log (librarian only)

### Monitor Logs
- `GET /api/monitor-logs` - Get monitor logs
- `POST /api/monitor-logs/log-hours` - Log hours with check-in code
- `PUT /api/monitor-logs/:id` - Update monitor log (librarian only)
- `DELETE /api/monitor-logs/:id` - Delete monitor log (librarian only)

### Periods
- `GET /api/periods` - Get period definitions
- `PUT /api/periods` - Update period definitions (librarian only)

### Check-in
- `GET /api/checkin/code` - Get current check-in code
- `POST /api/checkin/code` - Generate new check-in code (librarian only)

## Database Schema

The application uses PostgreSQL with the following main entities:
- Users (librarians and monitors)
- Shifts and Shift Assignments
- Tasks and Task Assignments/Statuses
- Monitor Logs
- Magazines and Magazine Logs
- Announcements
- Period Definitions
- Check-in Codes

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- CORS protection
- Helmet security headers

## Development

- The server runs on port 3001 by default
- Hot reloading is enabled in development mode
- Prisma Studio is available at `npm run db:studio`
- Health check endpoint: `GET /health`