import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Get period definitions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const periods = await prisma.periodDefinition.findMany({
      orderBy: { period: 'asc' }
    });

    res.json(periods);
  } catch (error) {
    console.error('Get period definitions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update period definitions (librarian only)
router.put('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const schema = z.object({ definitions: z.array(z.object({
      period: z.number().int().min(0).max(20),
      duration: z.number().int().min(1).max(120),
      startTime: z.string().min(4).max(5),
      endTime: z.string().min(4).max(5),
    }))});
    const { definitions } = schema.parse(req.body);

    // Clear existing definitions
    await prisma.periodDefinition.deleteMany({});

    // Create new definitions
    await prisma.periodDefinition.createMany({ data: definitions });

    // Get all periods
    const periods = await prisma.periodDefinition.findMany({ orderBy: { period: 'asc' } });

    res.json({ success: true, definitions: periods });
  } catch (error: any) {
    console.error('Update period definitions error:', error);
    res.status(400).json({ error: error.message || 'Invalid payload' });
  }
});

// Export periods (librarian only)
router.get('/export/json', authenticateToken, requireRole(['LIBRARIAN']), async (_req, res) => {
  try {
    const defs = await prisma.periodDefinition.findMany({ orderBy: { period: 'asc' } });
    res.json({ definitions: defs });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import periods (librarian only)
router.post('/import/json', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const schema = z.object({ definitions: z.array(z.object({ period: z.number().int().min(0).max(20), duration: z.number().int().min(1).max(120), startTime: z.string(), endTime: z.string() }))});
    const { definitions } = schema.parse(req.body);
    await prisma.periodDefinition.deleteMany({});
    await prisma.periodDefinition.createMany({ data: definitions });
    const defs = await prisma.periodDefinition.findMany({ orderBy: { period: 'asc' } });
    res.json({ success: true, definitions: defs });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Invalid payload' });
  }
});

export default router;