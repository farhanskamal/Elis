import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { emitRoleChange } from './notifications';

const router = express.Router();

// Get all users except main admin
router.get('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@school.edu';
    const users = await prisma.user.findMany({
      where: { email: { not: ADMIN_EMAIL } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        backgroundColor: true,
        createdAt: true
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        backgroundColor: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, profilePicture, backgroundColor, themePreferences, role } = req.body;
    const requester = (req as any).user;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Permission check: users can edit themselves, librarians can edit anyone
    const isEditingSelf = requester?.id === id;
    const isLibrarian = requester?.role === 'LIBRARIAN';
    if (!isEditingSelf && !isLibrarian) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (typeof profilePicture !== 'undefined') updateData.profilePicture = profilePicture;
    if (typeof backgroundColor !== 'undefined') updateData.backgroundColor = backgroundColor;
    if (typeof themePreferences !== 'undefined') updateData.themePreferences = themePreferences;
    // Only librarians can change roles, safeguard admin email cannot be demoted
    if (typeof role !== 'undefined') {
      if (requester?.role !== 'LIBRARIAN') {
        return res.status(403).json({ error: 'Only librarians can change roles' });
      }
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@school.edu';
      if (existingUser.email === ADMIN_EMAIL && role !== 'LIBRARIAN') {
        return res.status(400).json({ error: 'Admin account cannot be demoted' });
      }
      updateData.role = role;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        backgroundColor: true,
        themePreferences: true,
        createdAt: true
      }
    });

    // Audit log for role changes or sensitive updates
    try {
      const beforeRole = existingUser.role;
      const afterRole = updatedUser.role;
      const roleChanged = typeof role !== 'undefined' && beforeRole !== afterRole;
      if (roleChanged || name || email || profilePicture || typeof backgroundColor !== 'undefined') {
        await prisma.auditLog.create({
          data: {
            actorId: requester?.id,
            targetUserId: updatedUser.id,
            action: roleChanged ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
            details: JSON.stringify({ beforeRole, afterRole, name, email, profilePicture, backgroundColor }),
          }
        });
        if (roleChanged) {
          emitRoleChange(updatedUser.id, updatedUser.role);
        }
      }
    } catch (e) {
      // do not block on audit failures
      console.error('Audit log error:', e);
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { name, email, password, role = 'MONITOR' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
        profilePicture: `https://picsum.photos/seed/${name}/100/100`,
        backgroundColor: '#f3f4f6'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        backgroundColor: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting the last librarian
    if (existingUser.role === 'LIBRARIAN') {
      const librarianCount = await prisma.user.count({
        where: { role: 'LIBRARIAN' }
      });

      if (librarianCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last librarian' });
      }
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;