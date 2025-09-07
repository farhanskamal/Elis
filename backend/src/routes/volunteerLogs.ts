import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get volunteer logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { volunteerId } = req.query;
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;

    // If not librarian, only allow viewing own logs
    if (currentUserRole !== 'LIBRARIAN' && volunteerId && volunteerId !== currentUserId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const whereClause: any = {};
    if (volunteerId) {
      whereClause.volunteerId = volunteerId;
    } else if (currentUserRole !== 'LIBRARIAN') {
      whereClause.volunteerId = currentUserId;
    }

    const logs = await prisma.volunteerLog.findMany({
      where: whereClause,
      include: {
        volunteer: {
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
    console.error('Get volunteer logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log hours with check-in code
router.post('/log-hours', authenticateToken, async (req, res) => {
  try {
    const { date, period, code } = req.body;
    const volunteerId = (req as any).user.id;

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
    const existingLog = await prisma.volunteerLog.findUnique({
      where: {
        volunteerId_date_period: {
          volunteerId,
          date,
          period
        }
      }
    });

    if (existingLog) {
      return res.status(400).json({ error: 'Hours for this period have already been logged' });
    }

    // Get volunteer info
    const volunteer = await prisma.user.findUnique({
      where: { id: volunteerId },
      select: { name: true }
    });

    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Get period duration
    const periodDefinition = await prisma.periodDefinition.findUnique({
      where: { period }
    });

    const durationMinutes = periodDefinition?.duration || 50;

    const log = await prisma.volunteerLog.create({
      data: {
        volunteerId,
        volunteerName: volunteer.name,
        date,
        period,
        checkIn: 'Logged',
        checkOut: 'Logged',
        durationMinutes
      },
      include: {
        volunteer: {
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

// Update volunteer log (librarian only)
router.put('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if log exists
    const existingLog = await prisma.volunteerLog.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Volunteer log not found' });
    }

    const updatedLog = await prisma.volunteerLog.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        volunteer: {
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
    console.error('Update volunteer log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete volunteer log (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if log exists
    const existingLog = await prisma.volunteerLog.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Volunteer log not found' });
    }

    await prisma.volunteerLog.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete volunteer log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;