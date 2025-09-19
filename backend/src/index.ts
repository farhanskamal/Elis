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
app.set('trust proxy', 1); // Trust only the immediate proxy (Cloudflare) for accurate IP detection with rate limiting
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 0, // disable in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.method === 'OPTIONS'
});

// Middleware
app.use(helmet());
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
// CORS configuration with dynamic origin allowlist
const localOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
const envOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const defaultProdOrigins = [
  'https://elis-1.onrender.com',
  'https://letstestit.me',
];

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [...defaultProdOrigins, ...envOrigins]
  : [...localOrigins, 'https://letstestit.me']; // Allow production origin in dev for testing

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    console.log('CORS Origin received:', origin);
    console.log('Allowed origins:', allowedOrigins);
    if (!origin) {
      // Allow non-browser or same-origin requests
      return callback(null, true);
    }

    // Exact matches from allowlist
    if (allowedOrigins.includes(origin)) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    }

    try {
      const hostname = new URL(origin).hostname;
      const renderMatch = /\.onrender\.com$/.test(hostname);
      const vercelMatch = /\.vercel\.app$/.test(hostname);
      if (renderMatch || vercelMatch) {
        console.log('Origin allowed via regex:', origin);
        return callback(null, true);
      }
    } catch (_) {
      // fallthrough to reject
    }

    console.log('Origin rejected:', origin);
    return callback(new Error(`CORS not allowed from origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Explicitly handle preflight requests
app.options('*', cors(corsOptions));
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
