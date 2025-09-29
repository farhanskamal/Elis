import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// List laptops with current checkout (if any)
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const laptops = await prisma.laptop.findMany({
      orderBy: { number: 'asc' },
      include: {
        checkouts: {
          where: { checkedInAt: null },
          orderBy: { checkedOutAt: 'desc' },
          take: 1,
          include: {
            checkedOutBy: { select: { id: true, name: true } },
            checkedInBy: { select: { id: true, name: true } },
          }
        }
      }
    });

    const data = laptops.map(l => ({
      id: l.id,
      number: l.number,
      isAccessible: l.isAccessible,
      note: l.note,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      currentCheckout: l.checkouts[0] || null,
    }));

    res.json(data);
  } catch (error) {
    console.error('List laptops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a laptop (librarian only)
router.post('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { number, note } = req.body as { number?: number; note?: string };
    const actorId = (req as any).user.id as string;
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
      return res.status(400).json({ error: 'Valid integer "number" is required' });
    }
    const created = await prisma.laptop.create({ data: { number, note } });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: { actorId, action: 'LAPTOP_CREATE', details: JSON.stringify({ id: created.id, number, note }) }
      });
    } catch {}

    res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Laptop number already exists' });
    }
    console.error('Create laptop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk create laptops (librarian only)
router.post('/bulk', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { count, numbers } = req.body as { count?: number; numbers?: number[] };
    const actorId = (req as any).user.id as string;
    let nums: number[] = [];
    if (Array.isArray(numbers) && numbers.length > 0) {
      nums = numbers.filter(n => Number.isInteger(n) && n > 0);
    } else if (typeof count === 'number' && count > 0) {
      nums = Array.from({ length: Math.floor(count) }, (_, i) => i + 1);
    } else {
      return res.status(400).json({ error: 'Provide either positive "count" or an array of positive integer "numbers"' });
    }

    // Fetch existing numbers to avoid duplicates
    const existing = await prisma.laptop.findMany({ select: { number: true }, where: { number: { in: nums } } });
    const existingSet = new Set(existing.map(e => e.number));
    const toCreate = nums
      .filter(n => !existingSet.has(n))
      .map(n => ({ number: n }));

    if (toCreate.length === 0) {
      const all = await prisma.laptop.findMany({ orderBy: { number: 'asc' } });
      return res.json({ success: true, created: 0, laptops: all });
    }

    await prisma.laptop.createMany({ data: toCreate, skipDuplicates: true });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: { actorId, action: 'LAPTOP_BULK_CREATE', details: JSON.stringify({ created: toCreate.length, numbers: toCreate.map(t => t.number) }) }
      });
    } catch {}

    const laptops = await prisma.laptop.findMany({ orderBy: { number: 'asc' } });
    res.status(201).json({ success: true, created: toCreate.length, laptops });
  } catch (error) {
    console.error('Bulk create laptops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update laptop fields (librarian only)
router.put('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const actorId = (req as any).user.id as string;
    const { isAccessible, note, number } = req.body as { isAccessible?: boolean; note?: string; number?: number };

    const data: any = {};
    if (typeof isAccessible === 'boolean') data.isAccessible = isAccessible;
    if (typeof note === 'string') data.note = note;
    if (typeof number === 'number') data.number = number;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await prisma.laptop.update({ where: { id }, data });

    // Audit
    try {
      await prisma.auditLog.create({ data: { actorId, action: 'LAPTOP_UPDATE', details: JSON.stringify({ id, ...data }) } });
    } catch {}

    res.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Laptop number already exists' });
    }
    console.error('Update laptop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Checkout a laptop (both roles)
router.post('/:id/checkout', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { borrowerName, ossis } = req.body as { borrowerName?: string; ossis?: string };
    const userId = (req as any).user.id as string;

    if (!borrowerName || typeof borrowerName !== 'string' || borrowerName.trim().length < 2) {
      return res.status(400).json({ error: 'Borrower name is required' });
    }

    const laptop = await prisma.laptop.findUnique({ where: { id } });
    if (!laptop) {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    if (!laptop.isAccessible) {
      return res.status(400).json({ error: 'Laptop is not accessible' });
    }

    const active = await prisma.laptopCheckout.findFirst({ where: { laptopId: id, checkedInAt: null } });
    if (active) {
      return res.status(400).json({ error: 'Laptop is already checked out' });
    }

    const checkout = await prisma.laptopCheckout.create({
      data: {
        laptopId: id,
        borrowerName: borrowerName.trim(),
        ossis: ossis?.trim() || undefined,
        checkedOutById: userId,
      },
      include: {
        laptop: true,
        checkedOutBy: { select: { id: true, name: true } }
      }
    });

    // Audit
    try {
      await prisma.auditLog.create({ data: { actorId: userId, action: 'LAPTOP_CHECKOUT', details: JSON.stringify({ laptopId: id, borrowerName: borrowerName.trim(), ossis: ossis?.trim() }) } });
    } catch {}

    res.status(201).json(checkout);
  } catch (error) {
    console.error('Checkout laptop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Checkin a laptop (both roles)
router.post('/:id/checkin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id as string;

    const active = await prisma.laptopCheckout.findFirst({ where: { laptopId: id, checkedInAt: null } });
    if (!active) {
      return res.status(400).json({ error: 'No active checkout for this laptop' });
    }

    const updated = await prisma.laptopCheckout.update({
      where: { id: active.id },
      data: { checkedInAt: new Date(), checkedInById: userId },
      include: {
        laptop: true,
        checkedOutBy: { select: { id: true, name: true } },
        checkedInBy: { select: { id: true, name: true } },
      }
    });

    // Audit
    try {
      await prisma.auditLog.create({ data: { actorId: userId, action: 'LAPTOP_CHECKIN', details: JSON.stringify({ laptopId: id, checkoutId: active.id }) } });
    } catch {}

    res.json(updated);
  } catch (error) {
    console.error('Checkin laptop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a laptop (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const actorId = (req as any).user.id as string;

    // Ensure exists
    const existing = await prisma.laptop.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Laptop not found' });

    await prisma.laptop.delete({ where: { id } });

    try {
      await prisma.auditLog.create({ data: { actorId, action: 'LAPTOP_DELETE', details: JSON.stringify({ id, number: existing.number }) } });
    } catch {}

    res.json({ success: true });
  } catch (error) {
    console.error('Delete laptop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export laptops (librarian only)
router.get('/export/json', authenticateToken, requireRole(['LIBRARIAN']), async (_req, res) => {
  try {
    const laptops = await prisma.laptop.findMany({ orderBy: { number: 'asc' } });
    const payload = laptops.map(l => ({ number: l.number, isAccessible: l.isAccessible, note: l.note || '' }));
    res.json({ laptops: payload });
  } catch (error) {
    console.error('Export laptops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import laptops (librarian only)
router.post('/import/json', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const actorId = (req as any).user.id as string;
    const { laptops } = req.body as { laptops?: Array<{ number: number; isAccessible?: boolean; note?: string }> };
    if (!Array.isArray(laptops)) return res.status(400).json({ error: 'laptops array required' });

    // Upsert by number
    for (const entry of laptops) {
      if (!Number.isInteger(entry.number) || entry.number < 1) continue;
      await prisma.laptop.upsert({
        where: { number: entry.number },
        update: { isAccessible: entry.isAccessible ?? true, note: entry.note },
        create: { number: entry.number, isAccessible: entry.isAccessible ?? true, note: entry.note }
      });
    }

    try {
      await prisma.auditLog.create({ data: { actorId, action: 'LAPTOP_IMPORT', details: JSON.stringify({ count: laptops.length }) } });
    } catch {}

    const all = await prisma.laptop.findMany({ orderBy: { number: 'asc' } });
    res.json({ success: true, laptops: all });
  } catch (error) {
    console.error('Import laptops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
