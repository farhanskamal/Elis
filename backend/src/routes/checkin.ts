import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get current check-in code
router.get('/code', authenticateToken, async (req, res) => {
  try {
    const currentCode = await prisma.checkinCode.findFirst({
      where: {
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!currentCode) {
      return res.status(404).json({ error: 'No active check-in code found' });
    }

    res.json({ code: currentCode.code });
  } catch (error) {
    console.error('Get check-in code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate new check-in code (librarian only)
router.post('/code', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Invalidate all existing codes
    await prisma.checkinCode.updateMany({
      where: {
        expiresAt: { gt: new Date() }
      },
      data: {
        expiresAt: new Date()
      }
    });

    // Create new code
    const newCode = await prisma.checkinCode.create({
      data: {
        code,
        expiresAt
      }
    });

    res.json({ code: newCode.code });
  } catch (error) {
    console.error('Generate check-in code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;