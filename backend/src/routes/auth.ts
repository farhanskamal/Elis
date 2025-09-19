import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { validate, validationSchemas, strictRateLimit } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Login
router.post('/login', strictRateLimit, validate(validationSchemas.login), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
      profilePicture: true,
      backgroundColor: true,
      themePreferences: true
    }
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    user: userWithoutPassword,
    token
  });
}));

// Register (for creating new monitors)
router.post('/register', strictRateLimit, validate(validationSchemas.register), asyncHandler(async (req, res) => {
  const { name, email, password, role = 'MONITOR' } = req.body;

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
    }
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.status(201).json({ user: userWithoutPassword });
}));

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        backgroundColor: true,
        themePreferences: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;