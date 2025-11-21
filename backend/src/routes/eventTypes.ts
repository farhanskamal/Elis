import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Ensure default event types exist
async function ensureDefaultEventTypes() {
  const count = await prisma.eventType.count();
  if (count === 0) {
    await prisma.eventType.createMany({
      data: [
        { name: 'Closure', color: '#ef4444', icon: 'ban', closesLibrary: true },
        { name: 'Holiday', color: '#f59e0b', icon: 'calendar', closesLibrary: true },
        { name: 'General Event', color: '#3b82f6', icon: 'dot', closesLibrary: false },
        { name: 'Maintenance', color: '#10b981', icon: 'wrench', closesLibrary: true },
      ],
    });
  }
}

// Get all event types
router.get('/', authenticateToken, async (req, res) => {
  try {
    await ensureDefaultEventTypes();
    const types = await prisma.eventType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  } catch (error) {
    console.error('Get event types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event type (librarian only)
router.post('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { name, color, icon, closesLibrary } = req.body;
    if (!name || !color) {
      return res.status(400).json({ error: 'name and color are required' });
    }
    const type = await prisma.eventType.create({ data: { name, color, icon, closesLibrary: !!closesLibrary } });
    res.status(201).json(type);
  } catch (error) {
    console.error('Create event type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event type (librarian only)
router.put('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon, closesLibrary } = req.body;
    const updated = await prisma.eventType.update({ where: { id }, data: { name, color, icon, closesLibrary } });
    res.json(updated);
  } catch (error) {
    console.error('Update event type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event type (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.eventType.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export event types (librarian only)
router.get('/export/json', authenticateToken, requireRole(['LIBRARIAN']), async (_req, res) => {
  try {
    const types = await prisma.eventType.findMany({ orderBy: { name: 'asc' } });
    res.json({ types });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import event types (librarian only)
router.post('/import/json', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const schema = z.object({ types: z.array(z.object({ name: z.string().min(1), color: z.string().min(4), icon: z.string().optional(), closesLibrary: z.boolean().optional() }))});
    const { types } = schema.parse(req.body);
    for (const t of types) {
      const existing = await prisma.eventType.findUnique({ where: { name: t.name } });
      if (existing) {
        await prisma.eventType.update({ where: { id: existing.id }, data: { color: t.color, icon: t.icon, closesLibrary: !!t.closesLibrary } });
      } else {
        await prisma.eventType.create({ data: { name: t.name, color: t.color, icon: t.icon, closesLibrary: !!t.closesLibrary } });
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Invalid payload' });
  }
});

export default router;
