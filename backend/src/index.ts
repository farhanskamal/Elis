import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import compression from 'compression';
import { prisma } from './lib/prisma';
import { errorHandler, notFoundHandler, handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler';
import { monitorConnectionPool, startCleanupScheduler, checkDatabaseHealth } from './lib/transactions';
import { connectionLimiter, capacityCheck, getConnectionStats } from './middleware/connectionLimiter';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import shiftRoutes from './routes/shifts';
import magazineRoutes from './routes/magazines';
import monitorLogRoutes from './routes/monitorLogs';
import announcementRoutes from './routes/announcements';
import taskRoutes from './routes/tasks';
import periodRoutes from './routes/periods';
import checkinRoutes from './routes/checkin';
import auditRoutes from './routes/audit';
import notificationRoutes from './routes/notifications';

dotenv.config();

// Set up global error handlers
handleUncaughtException();
handleUnhandledRejection();

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
app.use(compression()); // Compress responses
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
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

console.log('CORS allowed origins:', allowedOrigins);
console.log('NODE_ENV:', process.env.NODE_ENV);

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

// Apply connection limiter (max 45 concurrent users)
app.use(connectionLimiter);

// Health check with database connectivity
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const connectionStats = getConnectionStats();
    const health = {
      status: dbHealth.healthy ? 'OK' : 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealth.healthy,
        latency: `${dbHealth.latency}ms`
      },
      connections: {
        active: connectionStats.active,
        maximum: connectionStats.max,
        utilization: `${connectionStats.utilization}%`
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };
    
    if (!dbHealth.healthy) {
      return res.status(503).json(health);
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'UNHEALTHY',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Capacity check endpoint
app.get('/capacity', capacityCheck);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/magazines', magazineRoutes);
app.use('/api/monitor-logs', monitorLogRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler for unknown routes
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

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

// Get host configuration from environment or default to 0.0.0.0 for remote access
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
  console.log(`🌐 Server accessible from: ${HOST === '0.0.0.0' ? 'all network interfaces' : HOST}`);
  
  // Initialize monitoring and cleanup in production
  if (process.env.NODE_ENV === 'production') {
    monitorConnectionPool();
    startCleanupScheduler();
    console.log('📈 Database monitoring and cleanup scheduler started');
  }
});

export default app;
