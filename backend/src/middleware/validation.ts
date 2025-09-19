import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import rateLimit from 'express-rate-limit';

// Common validation schemas
const emailSchema = z.string().email().min(3).max(100);
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().min(1).max(100).trim();
const idSchema = z.string().cuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const periodSchema = z.number().int().min(1).max(9);

// Sanitization helper
const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  }).trim();
};

const sanitizeInput = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return obj;
};

// Validation schemas for different endpoints
export const validationSchemas = {
  // Auth schemas
  login: z.object({
    email: emailSchema,
    password: z.string().min(1).max(128)
  }),
  
  register: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(['MONITOR', 'LIBRARIAN']).optional()
  }),

  // User schemas
  updateUser: z.object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    profilePicture: z.string().url().max(500).optional().or(z.literal('')),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    role: z.enum(['MONITOR', 'LIBRARIAN']).optional()
  }),

  createUser: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(['MONITOR', 'LIBRARIAN']).optional()
  }),

  // Task schemas
  createTask: z.object({
    title: z.string().min(1).max(200).trim(),
    description: z.string().min(1).max(2000).trim(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    dueDate: dateSchema,
    dueTime: timeSchema.optional(),
    assignedTo: z.array(idSchema).min(1).max(20)
  }),

  updateTask: z.object({
    title: z.string().min(1).max(200).trim().optional(),
    description: z.string().min(1).max(2000).trim().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    dueDate: dateSchema.optional(),
    dueTime: timeSchema.optional(),
    assignedTo: z.array(idSchema).min(1).max(20).optional()
  }),

  updateTaskStatus: z.object({
    monitorId: idSchema,
    status: z.enum(['PENDING', 'COMPLETED', 'CANNOT_COMPLETE'])
  }),

  // Shift schemas
  createShift: z.object({
    date: dateSchema,
    period: periodSchema,
    monitorIds: z.array(idSchema).max(10)
  }),

  updateShift: z.object({
    monitorIds: z.array(idSchema).max(10)
  }),

  // Announcement schemas
  createAnnouncement: z.object({
    title: z.string().min(1).max(200).trim(),
    content: z.string().min(1).max(5000).trim(),
    imageUrl: z.string().url().max(500).optional().or(z.literal(''))
  }),

  updateAnnouncement: z.object({
    title: z.string().min(1).max(200).trim().optional(),
    content: z.string().min(1).max(5000).trim().optional(),
    imageUrl: z.string().url().max(500).optional().or(z.literal(''))
  }),

  // Magazine schemas
  addMagazine: z.object({
    title: z.string().min(1).max(200).trim()
  }),

  logMagazineCheck: z.object({
    weekIdentifier: z.string().regex(/^\d{4}-W\d{2}$/)
  }),

  // Monitor log schemas
  logHours: z.object({
    date: dateSchema,
    period: periodSchema,
    code: z.string().length(6).regex(/^\d{6}$/)
  }),

  // Period definition schemas
  updatePeriodDefinitions: z.object({
    definitions: z.array(z.object({
      period: periodSchema,
      duration: z.number().int().min(10).max(180),
      startTime: timeSchema,
      endTime: timeSchema
    })).min(1).max(9)
  }),

  // Notification schemas
  broadcastNotification: z.object({
    title: z.string().min(1).max(100).trim(),
    message: z.string().min(1).max(500).trim(),
    targetUserId: idSchema.optional(),
    targetRole: z.enum(['MONITOR', 'LIBRARIAN']).optional()
  })
};

// Generic validation middleware factory
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize input first
      req.body = sanitizeInput(req.body);
      
      // Then validate
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }
      
      // Replace req.body with validated and sanitized data
      req.body = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Parameter validation middleware
export const validateParams = (paramSchema: Record<string, z.ZodSchema>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: { field: string; message: string }[] = [];
      
      for (const [param, schema] of Object.entries(paramSchema)) {
        const result = schema.safeParse(req.params[param]);
        if (!result.success) {
          errors.push({
            field: param,
            message: result.error.issues[0]?.message || 'Invalid parameter'
          });
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Parameter validation failed',
          details: errors
        });
      }
      
      next();
    } catch (error) {
      console.error('Parameter validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Query parameter validation
export const validateQuery = (querySchema: Record<string, z.ZodSchema>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: { field: string; message: string }[] = [];
      
      for (const [param, schema] of Object.entries(querySchema)) {
        if (req.query[param] !== undefined) {
          const result = schema.safeParse(req.query[param]);
          if (!result.success) {
            errors.push({
              field: param,
              message: result.error.issues[0]?.message || 'Invalid query parameter'
            });
          }
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Query validation failed',
          details: errors
        });
      }
      
      next();
    } catch (error) {
      console.error('Query validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Strict rate limiting for sensitive endpoints
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests to this endpoint, please try again later.',
  skip: (req) => process.env.NODE_ENV !== 'production'
});

// More lenient rate limiting for regular endpoints
export const moderateRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please slow down.',
  skip: (req) => process.env.NODE_ENV !== 'production'
});

// File size validation middleware
export const validateFileSize = (maxSizeBytes: number = 5 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: 'Request too large',
        maxSize: `${maxSizeBytes / 1024 / 1024}MB`
      });
    }
    
    next();
  };
};