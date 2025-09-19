import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all magazines
router.get('/', authenticateToken, async (req, res) => {
  try {
    const magazines = await prisma.magazine.findMany({
      orderBy: { title: 'asc' }
    });

    res.json(magazines);
  } catch (error) {
    console.error('Get magazines error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get magazine logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.magazineLog.findMany({
      include: {
        magazine: true,
        checkedByMonitor: {
          select: {
            id: true,
            name: true,
            profilePicture: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Get magazine logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add magazine (librarian only)
router.post('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const magazine = await prisma.magazine.create({
      data: { title }
    });

    res.status(201).json(magazine);
  } catch (error) {
    console.error('Add magazine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove magazine (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if magazine exists
    const existingMagazine = await prisma.magazine.findUnique({
      where: { id }
    });

    if (!existingMagazine) {
      return res.status(404).json({ error: 'Magazine not found' });
    }

    // Delete magazine (logs will be deleted due to cascade)
    await prisma.magazine.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove magazine error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log magazine check
router.post('/:id/log', authenticateToken, async (req, res) => {
  try {
    const { id: magazineId } = req.params;
    const { weekIdentifier } = req.body;
    const monitorId = (req as any).user.id;

    if (!weekIdentifier) {
      return res.status(400).json({ error: 'Week identifier is required' });
    }

    // Check if magazine exists
    const magazine = await prisma.magazine.findUnique({
      where: { id: magazineId }
    });

    if (!magazine) {
      return res.status(404).json({ error: 'Magazine not found' });
    }

    // Check if already logged for this week
    const existingLog = await prisma.magazineLog.findUnique({
      where: {
        magazineId_weekIdentifier: {
          magazineId,
          weekIdentifier
        }
      }
    });

    if (existingLog) {
      return res.status(400).json({ error: 'Magazine already checked for this week' });
    }

    const log = await prisma.magazineLog.create({
      data: {
        magazineId,
        weekIdentifier,
        checkedByMonitorId: monitorId
      },
      include: {
        magazine: true,
        checkedByMonitor: {
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
    console.error('Log magazine check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove magazine log (librarian only)
router.delete('/:id/log/:weekIdentifier', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id: magazineId, weekIdentifier } = req.params;

    // Check if log exists
    const existingLog = await prisma.magazineLog.findUnique({
      where: {
        magazineId_weekIdentifier: {
          magazineId,
          weekIdentifier
        }
      }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Magazine log not found' });
    }

    await prisma.magazineLog.delete({
      where: {
        magazineId_weekIdentifier: {
          magazineId,
          weekIdentifier
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove magazine log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;