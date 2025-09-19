import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get monitor logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { monitorId } = req.query;
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;

    // If not librarian, only allow viewing own logs
    if (currentUserRole !== 'LIBRARIAN' && monitorId && monitorId !== currentUserId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const whereClause: any = {};
    if (monitorId) {
      whereClause.monitorId = monitorId;
    } else if (currentUserRole !== 'LIBRARIAN') {
      whereClause.monitorId = currentUserId;
    }

    const logs = await prisma.monitorLog.findMany({
      where: whereClause,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            profilePicture: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Get monitor logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log hours with check-in code
router.post('/log-hours', authenticateToken, async (req, res) => {
  try {
    const { date, period, code } = req.body;
    const monitorId = (req as any).user.id;

    if (!date || !period || !code) {
      return res.status(400).json({ error: 'Date, period, and code are required' });
    }

    // Verify check-in code
    const validCode = await prisma.checkinCode.findFirst({
      where: {
        code,
        expiresAt: { gt: new Date() }
      }
    });

    if (!validCode) {
      return res.status(400).json({ error: 'Invalid check-in code' });
    }

    // Scheduling requirement disabled: allow logging even if not scheduled

    // Check if already logged
    const existingLog = await prisma.monitorLog.findUnique({
      where: {
        monitorId_date_period: {
          monitorId: monitorId,
          date,
          period
        }
      }
    });

    if (existingLog) {
      return res.status(400).json({ error: 'Hours for this period have already been logged' });
    }

    // Get monitor info
    const monitor = await prisma.user.findUnique({
      where: { id: monitorId },
      select: { name: true }
    });

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    // Get period duration
    const periodDefinition = await prisma.periodDefinition.findUnique({
      where: { period }
    });

    const durationMinutes = periodDefinition?.duration || 50;

    const log = await prisma.monitorLog.create({
      data: {
        monitorId: monitorId,
        monitorName: monitor.name,
        date,
        period,
        checkIn: 'Logged',
        checkOut: 'Logged',
        durationMinutes
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            profilePicture: true
          }
        }
      }
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Log hours error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update monitor log (librarian only)
router.put('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if log exists
    const existingLog = await prisma.monitorLog.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Monitor log not found' });
    }

    const updatedLog = await prisma.monitorLog.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            profilePicture: true
          }
        }
      }
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Update monitor log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete monitor log (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if log exists
    const existingLog = await prisma.monitorLog.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Monitor log not found' });
    }

    await prisma.monitorLog.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete monitor log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;