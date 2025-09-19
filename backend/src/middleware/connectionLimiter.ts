import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// Track active connections
const activeConnections = new Map<string, { timestamp: number; userId?: string; ip: string }>();
const MAX_CONCURRENT_USERS = 45;
const CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Cleanup inactive connections
const cleanupInactiveConnections = () => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [sessionId, connection] of activeConnections.entries()) {
    if (now - connection.timestamp > CONNECTION_TIMEOUT) {
      activeConnections.delete(sessionId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} inactive connections. Active: ${activeConnections.size}/${MAX_CONCURRENT_USERS}`);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupInactiveConnections, 5 * 60 * 1000);

// Generate session ID
const generateSessionId = (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';
  
  return `${userId}-${ip}-${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
};

// Middleware to track and limit connections
export const connectionLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Skip for health checks and static assets
  if (req.path === '/health' || req.path.startsWith('/static/') || req.path.startsWith('/assets/')) {
    return next();
  }
  
  const sessionId = generateSessionId(req);
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean up inactive connections before checking limit
  cleanupInactiveConnections();
  
  // Update or add connection
  const existingConnection = activeConnections.get(sessionId);
  if (existingConnection) {
    // Update timestamp for existing connection
    existingConnection.timestamp = now;
    existingConnection.userId = (req as any).user?.id;
  } else {
    // Check if we're at the limit
    if (activeConnections.size >= MAX_CONCURRENT_USERS) {
      console.warn(`Connection limit reached (${MAX_CONCURRENT_USERS}). Rejecting connection from ${ip}`);
      
      return res.status(503).json({
        error: 'Server at capacity',
        message: 'The server is currently at maximum capacity. Please try again in a few minutes.',
        code: 'SERVER_BUSY',
        retryAfter: 300 // 5 minutes
      });
    }
    
    // Add new connection
    activeConnections.set(sessionId, {
      timestamp: now,
      userId: (req as any).user?.id,
      ip
    });
    
    console.log(`New connection from ${ip}. Active: ${activeConnections.size}/${MAX_CONCURRENT_USERS}`);
  }
  
  // Clean up connection when request ends
  const cleanup = () => {
    // Don't immediately remove - let the timeout handle it to prevent rapid reconnections
    const connection = activeConnections.get(sessionId);
    if (connection) {
      connection.timestamp = now - (CONNECTION_TIMEOUT - 60000); // Mark for cleanup in 1 minute
    }
  };
  
  res.on('finish', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
  
  next();
};

// Get current connection stats
export const getConnectionStats = () => {
  cleanupInactiveConnections();
  
  const stats = {
    active: activeConnections.size,
    max: MAX_CONCURRENT_USERS,
    utilization: Math.round((activeConnections.size / MAX_CONCURRENT_USERS) * 100),
    connections: Array.from(activeConnections.entries()).map(([sessionId, conn]) => ({
      sessionId: sessionId.slice(0, 20) + '...',
      userId: conn.userId || 'anonymous',
      ip: conn.ip,
      connectedFor: Math.round((Date.now() - conn.timestamp) / 1000 / 60) // minutes
    }))
  };
  
  return stats;
};

// API endpoint to check server capacity
export const capacityCheck = (req: Request, res: Response) => {
  const stats = getConnectionStats();
  
  res.json({
    available: stats.active < stats.max,
    capacity: {
      current: stats.active,
      maximum: stats.max,
      utilization: `${stats.utilization}%`
    },
    estimatedWaitTime: stats.active >= stats.max ? '5-10 minutes' : 'none'
  });
};