import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Get shifts for a week
router.get('/week/:startDate', authenticateToken, async (req, res) => {
  try {
    const { startDate } = req.params;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 5);

    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: startDate,
          lt: end.toISOString().split('T')[0]
        }
      },
      include: {
        assignments: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        }
      }
    });

    // Transform to match frontend expectations
    const transformedShifts = shifts.map(shift => ({
      id: shift.id,
      date: shift.date,
      period: shift.period,
      monitorIds: shift.assignments.map(a => a.monitor.id),
      monitors: shift.assignments.map(a => a.monitor)
    }));

    res.json(transformedShifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create shift (librarian only)
router.post('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { date, period, monitorIds } = req.body;

    // Validate inputs (allow period=0)
    if (!date || typeof period !== 'number' || !Array.isArray(monitorIds)) {
      return res.status(400).json({ error: 'Date, period, and monitorIds are required' });
    }

    // Check if shift already exists for this date and period
    const existingShift = await prisma.shift.findUnique({
      where: {
        date_period: {
          date,
          period
        }
      }
    });

    if (existingShift) {
      return res.status(400).json({ error: 'Shift already exists for this date and period' });
    }

    // Verify all monitors exist
    const monitors = await prisma.user.findMany({
      where: {
        id: { in: monitorIds },
        role: 'MONITOR'
      }
    });

    if (monitors.length !== monitorIds.length) {
      return res.status(400).json({ error: 'One or more monitors not found' });
    }

    // Create shift with assignments
    const shift = await prisma.shift.create({
      data: {
        date,
        period,
        assignments: {
          create: monitorIds.map((monitorId: string) => ({
            monitorId: monitorId
          }))
        }
      },
      include: {
        assignments: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        }
      }
    });

    // Transform response
    const transformedShift = {
      id: shift.id,
      date: shift.date,
      period: shift.period,
      monitorIds: shift.assignments.map(a => a.monitor.id),
      monitors: shift.assignments.map(a => a.monitor)
    };

    res.status(201).json(transformedShift);
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shift (librarian only)
router.put('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { monitorIds } = req.body;

    if (!Array.isArray(monitorIds)) {
      return res.status(400).json({ error: 'monitorIds must be an array' });
    }

    // Check if shift exists
    const existingShift = await prisma.shift.findUnique({
      where: { id }
    });

    if (!existingShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Verify all monitors exist
    const monitors = await prisma.user.findMany({
      where: {
        id: { in: monitorIds },
        role: 'MONITOR'
      }
    });

    if (monitors.length !== monitorIds.length) {
      return res.status(400).json({ error: 'One or more monitors not found' });
    }

    // If no monitors remain, delete the shift entirely
    if (monitorIds.length === 0) {
      await prisma.shift.delete({ where: { id } });
      return res.json({ success: true, deleted: true });
    }

    // Update shift assignments
    await prisma.shiftAssignment.deleteMany({ where: { shiftId: id } });
    await prisma.shiftAssignment.createMany({
      data: monitorIds.map((monitorId: string) => ({ shiftId: id, monitorId: monitorId }))
    });

    // Get updated shift
    const updatedShift = await prisma.shift.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        }
      }
    });

    // Transform response
    const transformedShift = {
      id: updatedShift!.id,
      date: updatedShift!.date,
      period: updatedShift!.period,
      monitorIds: updatedShift!.assignments.map(a => a.monitor.id),
      monitors: updatedShift!.assignments.map(a => a.monitor)
    };

    res.json(transformedShift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export shifts (librarian only)
router.get('/export/json', authenticateToken, requireRole(['LIBRARIAN']), async (_req, res) => {
  try {
    const shifts = await prisma.shift.findMany({ include: { assignments: true }, orderBy: [{ date: 'asc' }, { period: 'asc' }] });
    const payload = shifts.map(s => ({ date: s.date, period: s.period, monitorIds: s.assignments.map(a => a.monitorId) }));
    res.json({ shifts: payload });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import shifts (librarian only, upsert by date+period)
router.post('/import/json', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const schema = z.object({ shifts: z.array(z.object({ date: z.string().min(8), period: z.number().int(), monitorIds: z.array(z.string()) }))});
    const { shifts } = schema.parse(req.body);
    for (const s of shifts) {
      // upsert the shift
      const existing = await prisma.shift.findUnique({ where: { date_period: { date: s.date, period: s.period } } });
      if (!existing) {
        await prisma.shift.create({ data: { date: s.date, period: s.period, assignments: { create: s.monitorIds.map(m => ({ monitorId: m })) } } });
      } else {
        await prisma.shiftAssignment.deleteMany({ where: { shiftId: existing.id } });
        await prisma.shiftAssignment.createMany({ data: s.monitorIds.map(m => ({ shiftId: existing.id, monitorId: m })) });
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Invalid payload' });
  }
});

// Delete shift (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift exists
    const existingShift = await prisma.shift.findUnique({
      where: { id }
    });

    if (!existingShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    await prisma.shift.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;