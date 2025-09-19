import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

// Transaction wrapper with retry logic for handling concurrent operations
export async function withTransaction<T>(
  operation: (tx: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        maxWait: 10000, // 10 seconds
        timeout: 30000, // 30 seconds
      });
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a serialization failure or deadlock that can be retried
      if (isRetryableError(error as Error) && attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Not retryable or max retries reached
      throw error;
    }
  }
  
  throw lastError;
}

// Check if an error is retryable (serialization failure, deadlock, etc.)
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // PostgreSQL serialization failures and deadlocks
  if (message.includes('serialization failure') ||
      message.includes('deadlock detected') ||
      message.includes('could not serialize access') ||
      message.includes('restart transaction')) {
    return true;
  }
  
  // Prisma-specific retryable errors
  if (message.includes('transaction failed') ||
      message.includes('connection timeout') ||
      message.includes('connection refused')) {
    return true;
  }
  
  return false;
}

// Optimistic locking helper
export async function withOptimisticLocking<T extends { updatedAt: Date }>(
  findOperation: () => Promise<T | null>,
  updateOperation: (item: T) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const item = await findOperation();
    if (!item) {
      throw new Error('Item not found');
    }
    
    try {
      return await updateOperation(item);
    } catch (error) {
      // Check if it's a version conflict (updatedAt changed)
      if (error instanceof Error && error.message.includes('version')) {
        if (attempt < maxRetries - 1) {
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
          continue;
        }
      }
      throw error;
    }
  }
  
  throw new Error('Maximum retry attempts reached');
}

// Batch operation helper to prevent overwhelming the database
export async function batchOperation<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
    
    // Small delay between batches to prevent overwhelming the database
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return results;
}

// Safe upsert operation that handles race conditions
export async function safeUpsert<T>(
  model: any, // Prisma model
  where: any,
  create: any,
  update: any,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await model.upsert({
        where,
        create,
        update
      });
    } catch (error) {
      if (isRetryableError(error as Error) && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Maximum retry attempts reached for upsert operation');
}

// Connection pool monitoring
export function monitorConnectionPool() {
  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      try {
        // Simple health check instead of detailed metrics
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;
        
        console.log('Database health:', {
          timestamp: new Date().toISOString(),
          latency: `${latency}ms`,
          status: 'healthy'
        });
      } catch (error) {
        console.error('Database health check failed:', error);
      }
    }, 60000); // Every minute
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      healthy: true,
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Cleanup expired records (for checkin codes, etc.)
export async function cleanupExpiredRecords() {
  try {
    const now = new Date();
    
    // Clean up expired checkin codes
    const deletedCodes = await prisma.checkinCode.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
    
    // Clean up old audit logs (keep last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: sixMonthsAgo
        }
      }
    });
    
    console.log(`Cleanup completed: ${deletedCodes.count} expired codes, ${deletedLogs.count} old audit logs`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Start cleanup scheduler
export function startCleanupScheduler() {
  // Run cleanup every hour
  setInterval(cleanupExpiredRecords, 60 * 60 * 1000);
  
  // Run initial cleanup after 5 minutes
  setTimeout(cleanupExpiredRecords, 5 * 60 * 1000);
}