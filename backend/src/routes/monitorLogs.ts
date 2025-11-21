import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { z } from 'zod';

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

    // Get period duration with Wednesday adjustment (Edison schedule)
    const periodDefinition = await prisma.periodDefinition.findUnique({
      where: { period }
    });

    const day = new Date(date + 'T00:00:00').getDay(); // 0=Sun .. 6=Sat
    let durationMinutes: number | null = null;
    if (day === 3) { // Wednesday
      durationMinutes = period === 0 ? 45 : 40;
    } else {
      durationMinutes = periodDefinition?.duration ?? (period === 0 ? 45 : 46);
    }

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

// Log hours for a monitor (librarian only - no check-in code required)
router.post('/log-hours-librarian', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { monitorId, date, period, durationMinutes } = req.body;
    const librarianId = (req as any).user.id;

    if (!monitorId || !date || !period) {
      return res.status(400).json({ error: 'Monitor ID, date, and period are required' });
    }

    // Check if monitor exists
    const monitor = await prisma.user.findUnique({
      where: { id: monitorId },
      select: { name: true, role: true }
    });

    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    if (monitor.role !== 'MONITOR') {
      return res.status(400).json({ error: 'User is not a monitor' });
    }

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
      return res.status(400).json({ error: 'Hours for this monitor, date, and period have already been logged' });
    }

    // Use provided duration or get from period definition
    let finalDurationMinutes = durationMinutes;
    if (!finalDurationMinutes) {
      const periodDefinition = await prisma.periodDefinition.findUnique({
        where: { period }
      });
      const day = new Date(date + 'T00:00:00').getDay();
      if (day === 3) {
        finalDurationMinutes = period === 0 ? 45 : 40;
      } else {
        finalDurationMinutes = periodDefinition?.duration ?? (period === 0 ? 45 : 46);
      }
    }

    const log = await prisma.monitorLog.create({
      data: {
        monitorId: monitorId,
        monitorName: monitor.name,
        date,
        period,
        checkIn: 'Added by Librarian',
        checkOut: 'Added by Librarian',
        durationMinutes: finalDurationMinutes
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

    // Create audit log for librarian action
    try {
      await prisma.auditLog.create({
        data: {
          actorId: librarianId,
          targetUserId: monitorId,
          action: 'HOURS_ADDED_BY_LIBRARIAN',
          details: JSON.stringify({ date, period, durationMinutes: finalDurationMinutes }),
        }
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }

    res.status(201).json(log);
  } catch (error) {
    console.error('Log hours by librarian error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export monitor logs (librarian only)
router.get('/export/json', authenticateToken, requireRole(['LIBRARIAN']), async (_req, res) => {
  try {
    const logs = await prisma.monitorLog.findMany({ orderBy: [{ date: 'asc' }, { period: 'asc' }] });
    const payload = logs.map(l => ({ monitorId: l.monitorId, date: l.date, period: l.period, durationMinutes: l.durationMinutes || null }));
    res.json({ logs: payload });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import monitor logs (librarian only, upsert by composite)
router.post('/import/json', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const schema = z.object({ logs: z.array(z.object({ monitorId: z.string().min(1), date: z.string().min(8), period: z.number().int(), durationMinutes: z.number().int().nullable().optional() }))});
    const { logs } = schema.parse(req.body);
    for (const l of logs) {
      const existing = await prisma.monitorLog.findUnique({ where: { monitorId_date_period: { monitorId: l.monitorId, date: l.date, period: l.period } } });
      if (existing) {
        await prisma.monitorLog.update({ where: { id: existing.id }, data: { durationMinutes: l.durationMinutes ?? existing.durationMinutes } });
      } else {
        const monitor = await prisma.user.findUnique({ where: { id: l.monitorId }, select: { name: true } });
        if (!monitor) continue;
        await prisma.monitorLog.create({ data: { monitorId: l.monitorId, monitorName: monitor.name, date: l.date, period: l.period, checkIn: 'Imported', checkOut: 'Imported', durationMinutes: l.durationMinutes ?? null } });
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Invalid payload' });
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