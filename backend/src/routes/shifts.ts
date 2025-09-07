import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

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
            volunteer: {
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
      volunteerIds: shift.assignments.map(a => a.volunteer.id),
      volunteers: shift.assignments.map(a => a.volunteer)
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
    const { date, period, volunteerIds } = req.body;

    if (!date || !period || !Array.isArray(volunteerIds)) {
      return res.status(400).json({ error: 'Date, period, and volunteerIds are required' });
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

    // Verify all volunteers exist
    const volunteers = await prisma.user.findMany({
      where: {
        id: { in: volunteerIds },
        role: 'VOLUNTEER'
      }
    });

    if (volunteers.length !== volunteerIds.length) {
      return res.status(400).json({ error: 'One or more volunteers not found' });
    }

    // Create shift with assignments
    const shift = await prisma.shift.create({
      data: {
        date,
        period,
        assignments: {
          create: volunteerIds.map((volunteerId: string) => ({
            volunteerId
          }))
        }
      },
      include: {
        assignments: {
          include: {
            volunteer: {
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
      volunteerIds: shift.assignments.map(a => a.volunteer.id),
      volunteers: shift.assignments.map(a => a.volunteer)
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
    const { volunteerIds } = req.body;

    if (!Array.isArray(volunteerIds)) {
      return res.status(400).json({ error: 'volunteerIds must be an array' });
    }

    // Check if shift exists
    const existingShift = await prisma.shift.findUnique({
      where: { id }
    });

    if (!existingShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Verify all volunteers exist
    const volunteers = await prisma.user.findMany({
      where: {
        id: { in: volunteerIds },
        role: 'VOLUNTEER'
      }
    });

    if (volunteers.length !== volunteerIds.length) {
      return res.status(400).json({ error: 'One or more volunteers not found' });
    }

    // If no volunteers remain, delete the shift entirely
    if (volunteerIds.length === 0) {
      await prisma.shift.delete({ where: { id } });
      return res.json({ success: true, deleted: true });
    }

    // Update shift assignments
    await prisma.shiftAssignment.deleteMany({ where: { shiftId: id } });
    await prisma.shiftAssignment.createMany({
      data: volunteerIds.map((volunteerId: string) => ({ shiftId: id, volunteerId }))
    });

    // Get updated shift
    const updatedShift = await prisma.shift.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            volunteer: {
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
      volunteerIds: updatedShift!.assignments.map(a => a.volunteer.id),
      volunteers: updatedShift!.assignments.map(a => a.volunteer)
    };

    res.json(transformedShift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
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