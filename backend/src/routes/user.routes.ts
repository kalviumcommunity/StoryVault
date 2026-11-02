import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// GET /api/users - List users (Admin only)
router.get('/', authenticate, requireRole(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { collections: true, briefs: true, savedSearches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/role - Update user role (Admin only)
router.patch('/:id/role', authenticate, requireRole(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = z.object({ role: z.nativeEnum(Role) }).parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_USER_ROLE',
      entityType: 'User',
      entityId: id,
      details: { updatedRole: role },
      ipAddress: req.ip,
    });

    res.json({ message: 'User role updated successfully', user });
  } catch (err) {
    next(err);
  }
});

export default router;
