import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

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
    const { definitions } = req.body;

    if (!Array.isArray(definitions)) {
      return res.status(400).json({ error: 'Definitions must be an array' });
    }

    // Validate definitions
    for (const def of definitions) {
      if (!def.period || !def.duration || !def.startTime || !def.endTime) {
        return res.status(400).json({ error: 'Each definition must have period, duration, startTime, and endTime' });
      }
    }

    // Clear existing definitions
    await prisma.periodDefinition.deleteMany({});

    // Create new definitions
    const createdPeriods = await prisma.periodDefinition.createMany({
      data: definitions
    });

    // Get all periods
    const periods = await prisma.periodDefinition.findMany({
      orderBy: { period: 'asc' }
    });

    res.json({ success: true, definitions: periods });
  } catch (error) {
    console.error('Update period definitions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;