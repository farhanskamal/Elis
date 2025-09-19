import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

// Custom error class for application errors
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error logger
const logError = (error: Error, req: Request) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  
  console.error(`[${timestamp}] ${method} ${url} - ${error.message}`, {
    error: error.message,
    stack: error.stack,
    method,
    url,
    userAgent,
    ip,
    body: process.env.NODE_ENV === 'development' ? req.body : '[REDACTED]',
    userId: (req as any).user?.id || 'Anonymous'
  });
};

// Handle different types of errors
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target as string[] | undefined;
      const fieldName = field?.[0] || 'field';
      return new AppError(`${fieldName} already exists`, 409);
    
    case 'P2025':
      // Record not found
      return new AppError('Record not found', 404);
    
    case 'P2003':
      // Foreign key constraint violation
      return new AppError('Related record not found', 400);
    
    case 'P2014':
      // Invalid ID
      return new AppError('Invalid ID provided', 400);
    
    case 'P2021':
      // Table doesn't exist
      return new AppError('Database error', 500);
    
    case 'P2022':
      // Column doesn't exist
      return new AppError('Database schema error', 500);
    
    default:
      return new AppError('Database error', 500);
  }
};

const handleZodError = (error: ZodError): AppError => {
  const errors = error.issues.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  return new AppError(`Validation failed: ${JSON.stringify(errors)}`, 400);
};

const handleJWTError = (): AppError => {
  return new AppError('Invalid token', 401);
};

const handleJWTExpiredError = (): AppError => {
  return new AppError('Token has expired', 401);
};

// Send error response
const sendErrorResponse = (error: AppError, res: Response) => {
  const { statusCode, message } = error;
  
  // Determine if we should send stack trace
  const sendStackTrace = process.env.NODE_ENV === 'development';
  
  const errorResponse: any = {
    error: message,
    status: 'error',
    timestamp: new Date().toISOString()
  };
  
  if (sendStackTrace) {
    errorResponse.stack = error.stack;
  }
  
  // Add specific error codes for client handling
  if (statusCode === 401) {
    errorResponse.code = 'UNAUTHORIZED';
  } else if (statusCode === 403) {
    errorResponse.code = 'FORBIDDEN';
  } else if (statusCode === 404) {
    errorResponse.code = 'NOT_FOUND';
  } else if (statusCode === 409) {
    errorResponse.code = 'CONFLICT';
  } else if (statusCode === 429) {
    errorResponse.code = 'RATE_LIMITED';
  } else if (statusCode >= 500) {
    errorResponse.code = 'INTERNAL_ERROR';
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      errorResponse.error = 'Internal server error';
    }
  }
  
  res.status(statusCode).json(errorResponse);
};

// Main error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log all errors
  logError(error, req);
  
  let appError: AppError;
  
  // Convert different error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    appError = new AppError('Database connection error', 500);
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    appError = new AppError('Database panic error', 500);
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    appError = new AppError('Database initialization error', 500);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = new AppError('Database validation error', 400);
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (error.name === 'JsonWebTokenError') {
    appError = handleJWTError();
  } else if (error.name === 'TokenExpiredError') {
    appError = handleJWTExpiredError();
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    appError = new AppError('Invalid JSON in request body', 400);
  } else {
    // Unknown error
    appError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : error.message,
      500,
      false
    );
  }
  
  sendErrorResponse(appError, res);
};

// Async error wrapper - catches async errors and passes to error handler
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unknown routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Graceful shutdown
    process.exit(1);
  });
};

// Uncaught exception handler
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    // Graceful shutdown
    process.exit(1);
  });
};