import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

type Client = { id: string; userId: string; res: express.Response };

const router = express.Router();
const clients: Client[] = [];

// SSE stream for authenticated users
// Support token via query param for EventSource (since custom headers aren't supported)
router.get('/stream', async (req: any, res) => {
  if (!req.user) {
    const token = req.query.token as string | undefined;
    if (!token) {
      // Fallback to header if provided
      const authHeader = req.headers['authorization'] as string | undefined;
      if (!authHeader) {
        return res.status(401).end();
      }
    }
    try {
      const decoded: any = jwt.verify((req.query.token as string) || (req.headers['authorization'] as string).split(' ')[1], process.env.JWT_SECRET!);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true } });
      if (!user) return res.status(401).end();
      req.user = { id: user.id, email: user.email, role: decoded.role };
    } catch {
      return res.status(401).end();
    }
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client: Client = { id: `${Date.now()}-${Math.random()}`, userId: req.user.id, res };
  clients.push(client);

  // Send initial heartbeat
  res.write(`event: heartbeat\n`);
  res.write(`data: {"ok":true}\n\n`);

  req.on('close', () => {
    const idx = clients.findIndex(c => c.id === client.id);
    if (idx >= 0) clients.splice(idx, 1);
  });
});

// Admin broadcast custom notification
router.post('/broadcast', authenticateToken, async (req: any, res) => {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@school.edu';
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Only main admin can broadcast' });
  }
  const { title, message, targetUserId, targetRole } = req.body;
  const payload = { type: 'broadcast', title, message };
  let sent = 0;
  clients.forEach(c => {
    if (targetUserId && c.userId !== targetUserId) return;
    // For role targeting, client-side can filter after a user refresh; skipped for brevity
    c.res.write(`event: notification\n`);
    c.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    sent++;
  });
  res.json({ success: true, sent });
});

// Helper to emit role change
export const emitRoleChange = (userId: string, newRole: string) => {
  const payload = { type: 'role_change', role: newRole };
  clients.forEach(c => {
    if (c.userId === userId) {
      try {
        c.res.write(`event: notification\n`);
        c.res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {}
    }
  });
};

export default router;

