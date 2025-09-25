import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Create a kiosk check-in for a monitor (1-hour cooldown)
router.post('/checkin', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { monitorId } = req.body as { monitorId?: string };
    if (!monitorId) {
      return res.status(400).json({ error: 'monitorId is required' });
    }

    // Ensure monitor exists and is a MONITOR
    const monitor = await prisma.user.findUnique({ where: { id: monitorId }, select: { id: true, role: true, name: true } });
    if (!monitor || monitor.role !== 'MONITOR') {
      return res.status(400).json({ error: 'Monitor not found or not a MONITOR' });
    }

    // Enforce 1-hour cooldown
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.kioskCheckin.findFirst({
      where: { monitorId, timestamp: { gt: oneHourAgo } },
      orderBy: { timestamp: 'desc' }
    });
    if (recent) {
      return res.status(400).json({ error: 'Monitor checked in within the last hour' });
    }

    const record = await prisma.kioskCheckin.create({ data: { monitorId } });
    res.status(201).json(record);
  } catch (error) {
    console.error('Kiosk checkin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get last kiosk check-in for a monitor
router.get('/checkin/last', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const monitorId = req.query.monitorId as string | undefined;
    if (!monitorId) {
      return res.status(400).json({ error: 'monitorId is required' });
    }
    const last = await prisma.kioskCheckin.findFirst({
      where: { monitorId },
      orderBy: { timestamp: 'desc' }
    });
    res.json(last || null);
  } catch (error) {
    console.error('Get last kiosk checkin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;