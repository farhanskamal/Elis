import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Helper to check overlap between [startDate, endDate] and filter
function buildDateOverlapWhere(start: string, end: string) {
  // Events that start before end and end on/after start
  return {
    AND: [
      { startDate: { lt: end } },
      { endDate: { gte: start } }
    ]
  };
}

// Get events for a month (YYYY-MM) with hard limit of 50
router.get('/month/:month', authenticateToken, async (req, res) => {
  try {
    const { month } = req.params; // e.g., 2025-09
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be in format YYYY-MM' });
    }

    const start = `${month}-01`;
    const startDate = new Date(start);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    const end = endDate.toISOString().split('T')[0];

    const events = await prisma.calendarEvent.findMany({
      where: buildDateOverlapWhere(start, end),
      include: { type: true },
      orderBy: [{ startDate: 'asc' }, { allDay: 'desc' }],
      take: 50,
    });

    res.json(events);
  } catch (error) {
    console.error('Get month events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get events in a date range [start, end] inclusive
router.get('/range', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end are required (YYYY-MM-DD)' });
    }

    const events = await prisma.calendarEvent.findMany({
      where: buildDateOverlapWhere(start, end),
      include: { type: true },
      orderBy: [{ startDate: 'asc' }, { allDay: 'desc' }],
    });

    res.json(events);
  } catch (error) {
    console.error('Get range events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event (librarian only)
router.post('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { title, typeId, startDate, endDate, allDay, periodStart, periodEnd, description } = req.body;
    if (!title || !typeId || !startDate || !endDate) {
      return res.status(400).json({ error: 'title, typeId, startDate, endDate are required' });
    }

    if (periodStart && periodEnd && periodStart > periodEnd) {
      return res.status(400).json({ error: 'periodStart cannot be greater than periodEnd' });
    }

    const created = await prisma.calendarEvent.create({
      data: {
        title,
        typeId,
        startDate,
        endDate,
        allDay: !!allDay,
        periodStart: periodStart ?? null,
        periodEnd: periodEnd ?? null,
        description: description ?? null,
        createdById: (req as any).user?.id,
      },
      include: { type: true },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event (librarian only)
router.put('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, typeId, startDate, endDate, allDay, periodStart, periodEnd, description } = req.body;
    if (periodStart && periodEnd && periodStart > periodEnd) {
      return res.status(400).json({ error: 'periodStart cannot be greater than periodEnd' });
    }

    const updated = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        typeId,
        startDate,
        endDate,
        allDay,
        periodStart: periodStart ?? null,
        periodEnd: periodEnd ?? null,
        description: description ?? null,
      },
      include: { type: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.calendarEvent.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
