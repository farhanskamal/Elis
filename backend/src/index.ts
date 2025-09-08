import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import shiftRoutes from './routes/shifts';
import magazineRoutes from './routes/magazines';
import volunteerLogRoutes from './routes/volunteerLogs';
import announcementRoutes from './routes/announcements';
import taskRoutes from './routes/tasks';
import periodRoutes from './routes/periods';
import checkinRoutes from './routes/checkin';
import auditRoutes from './routes/audit';
import notificationRoutes from './routes/notifications';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 0, // disable in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
// CORS configuration with dynamic origin allowlist
const localOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const envOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const defaultProdOrigins = [
  'https://elis-1.onrender.com',
];

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [...defaultProdOrigins, ...envOrigins]
  : localOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      // Allow non-browser or same-origin requests
      return callback(null, true);
    }

    // Exact matches from allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow common hosting domains (Render/Vercel) for your deployments
    const renderMatch = /\.onrender\.com$/.test(new URL(origin).hostname);
    const vercelMatch = /\.vercel\.app$/.test(new URL(origin).hostname);
    if (renderMatch || vercelMatch) {
      return callback(null, true);
    }

    return callback(new Error(`CORS not allowed from origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/magazines', magazineRoutes);
app.use('/api/volunteer-logs', volunteerLogRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;