import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        assignments: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        },
        statuses: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                profilePicture: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match frontend expectations
    const transformedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      assignedTo: task.assignments.map(a => a.monitor.id),
      statuses: task.statuses.map(s => ({
        monitorId: s.monitor.id,
        status: s.status,
        completedAt: s.completedAt
      })),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));

    res.json(transformedTasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tasks for specific monitor
router.get('/monitor/:monitorId', authenticateToken, async (req, res) => {
  try {
    const { monitorId } = req.params;
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;

    // If not librarian, only allow viewing own tasks
    if (currentUserRole !== 'LIBRARIAN' && monitorId !== currentUserId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const tasks = await prisma.task.findMany({
      where: {
        assignments: {
          some: {
            monitorId: monitorId
          }
        }
      },
      include: {
        assignments: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        },
        statuses: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                profilePicture: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match frontend expectations
    const transformedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      assignedTo: task.assignments.map(a => a.monitor.id),
      statuses: task.statuses.map(s => ({
        monitorId: s.monitor.id,
        status: s.status,
        completedAt: s.completedAt
      })),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));

    res.json(transformedTasks);
  } catch (error) {
    console.error('Get monitor tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task (librarian only)
router.post('/', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { title, description, priority, dueDate, dueTime, assignedTo } = req.body;

    if (!title || !description || !priority || !dueDate || !Array.isArray(assignedTo)) {
      return res.status(400).json({ error: 'Title, description, priority, dueDate, and assignedTo are required' });
    }

    // Verify all assigned monitors exist
    const monitors = await prisma.user.findMany({
      where: {
        id: { in: assignedTo },
        role: 'MONITOR'
      }
    });

    if (monitors.length !== assignedTo.length) {
      return res.status(400).json({ error: 'One or more monitors not found' });
    }

    // Create task with assignments and statuses
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority as any,
        dueDate,
        dueTime,
        assignments: {
          create: assignedTo.map((monitorId: string) => ({
            monitorId: monitorId
          }))
        },
        statuses: {
          create: assignedTo.map((monitorId: string) => ({
            monitorId: monitorId,
            status: 'PENDING'
          }))
        }
      },
      include: {
        assignments: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        },
        statuses: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                profilePicture: true
              }
            }
          }
        }
      }
    });

    // Transform response
    const transformedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      assignedTo: task.assignments.map(a => a.monitor.id),
      statuses: task.statuses.map(s => ({
        monitorId: s.monitor.id,
        status: s.status,
        completedAt: s.completedAt
      })),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };

    res.status(201).json(transformedTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task (librarian only)
router.put('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, dueTime, assignedTo } = req.body;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If assignedTo is being updated, verify monitors exist
    if (assignedTo) {
      const monitors = await prisma.user.findMany({
        where: {
          id: { in: assignedTo },
          role: 'MONITOR'
        }
      });

      if (monitors.length !== assignedTo.length) {
        return res.status(400).json({ error: 'One or more monitors not found' });
      }
    }

    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        priority: priority as any,
        dueDate,
        dueTime,
        updatedAt: new Date()
      }
    });

    // Update assignments if provided
    if (assignedTo) {
      // Delete existing assignments and statuses
      await prisma.taskAssignment.deleteMany({
        where: { taskId: id }
      });

      await prisma.taskStatusRecord.deleteMany({
        where: { taskId: id }
      });

      // Create new assignments and statuses
      await prisma.taskAssignment.createMany({
        data: assignedTo.map((monitorId: string) => ({
          taskId: id,
          monitorId: monitorId
        }))
      });

      await prisma.taskStatusRecord.createMany({
        data: assignedTo.map((monitorId: string) => ({
          taskId: id,
          monitorId: monitorId,
          status: 'PENDING'
        }))
      });
    }

    // Get updated task with relations
    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        },
        statuses: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                profilePicture: true
              }
            }
          }
        }
      }
    });

    // Transform response
    const transformedTask = {
      id: updatedTask!.id,
      title: updatedTask!.title,
      description: updatedTask!.description,
      priority: updatedTask!.priority,
      dueDate: updatedTask!.dueDate,
      dueTime: updatedTask!.dueTime,
      assignedTo: updatedTask!.assignments.map(a => a.monitor.id),
      statuses: updatedTask!.statuses.map(s => ({
        monitorId: s.monitor.id,
        status: s.status,
        completedAt: s.completedAt
      })),
      createdAt: updatedTask!.createdAt,
      updatedAt: updatedTask!.updatedAt
    };

    res.json(transformedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task status (monitor or librarian)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { monitorId, status } = req.body;
    const currentUserId = (req as any).user.id;
    const currentUserRole = (req as any).user.role;

    // If not librarian, only allow updating own status
    if (currentUserRole !== 'LIBRARIAN' && monitorId !== currentUserId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (!monitorId || !status) {
      return res.status(400).json({ error: 'MonitorId and status are required' });
    }

    // Check if task exists and monitor is assigned
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        assignments: {
          some: {
            monitorId: monitorId
          }
        }
      }
    });

      if (!task) {
      return res.status(404).json({ error: 'Task not found or monitor not assigned' });
    }

    // Update or create status
    const taskStatus = await prisma.taskStatusRecord.upsert({
      where: {
        taskId_monitorId: {
          taskId,
          monitorId: monitorId
        }
      },
      update: {
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        updatedAt: new Date()
      },
      create: {
        taskId,
        monitorId: monitorId,
        status: status as any,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    });

    res.json(taskStatus);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task (librarian only)
router.delete('/:id', authenticateToken, requireRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;