import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DocumentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { getAllowedAccessLevels } from '../lib/accessControl';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createCollectionSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

// GET /api/collections - List user collections & public collections
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowedAccess = getAllowedAccessLevels(req.user?.role);
    const collections = await prisma.collection.findMany({
      where: req.user
        ? { OR: [{ ownerId: req.user.id }, { isPublic: true }] }
        : { isPublic: true },
      include: {
        owner: { select: { id: true, name: true } },
        items: {
          where: {
            document: {
              status: DocumentStatus.INDEXED,
              accessLevel: { in: allowedAccess },
            },
          },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({
      collections: collections.map(({ items, ...collection }) => ({
        ...collection,
        _count: { items: items.length },
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/saved-searches', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const saved = await prisma.savedSearch.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ savedSearches: saved });
  } catch (err) {
    next(err);
  }
});

// GET /api/collections/:id - Collection detail with documents
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const allowedAccess = getAllowedAccessLevels(req.user?.role);
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        items: {
          where: {
            document: {
              status: DocumentStatus.INDEXED,
              accessLevel: { in: allowedAccess },
            },
          },
          include: {
            document: {
              select: {
                id: true,
                title: true,
                slug: true,
                documentType: true,
                publicationDate: true,
                summary: true,
                author: { select: { name: true } },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!collection) throw new AppError('Collection not found', 404);
    if (!collection.isPublic && collection.ownerId !== req.user?.id) {
      throw new AppError('Collection not found', 404);
    }

    res.json({
      collection: {
        ...collection,
        items: collection.items.map((i) => ({
          ...i,
          document: {
            ...i.document,
            publicationDate: i.document.publicationDate.toISOString().split('T')[0],
          },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/collections - Create collection
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCollectionSchema.parse(req.body);
    const collection = await prisma.collection.create({
      data: {
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        ownerId: req.user!.id,
      },
    });
    res.status(201).json({ message: 'Collection created successfully', collection });
  } catch (err) {
    next(err);
  }
});

// POST /api/collections/:id/documents - Add document to collection
router.post('/:id/documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { documentId, notes } = z
      .object({ documentId: z.string(), notes: z.string().optional() })
      .parse(req.body);

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new AppError('Collection not found', 404);
    if (collection.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Cannot modify another user collection', 403);
    }

    const item = await prisma.collectionDocument.upsert({
      where: {
        collectionId_documentId: {
          collectionId: id,
          documentId,
        },
      },
      update: { notes },
      create: {
        collectionId: id,
        documentId,
        notes,
      },
    });

    res.status(201).json({ message: 'Document added to collection', item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/collections/:id/documents/:docId - Remove document
router.delete('/:id/documents/:docId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, docId } = req.params;
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new AppError('Collection not found', 404);
    if (collection.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    await prisma.collectionDocument.deleteMany({
      where: { collectionId: id, documentId: docId },
    });

    res.json({ message: 'Document removed from collection' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/collections/:id - Delete collection
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new AppError('Collection not found', 404);
    if (collection.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    await prisma.collection.delete({ where: { id } });
    res.json({ message: 'Collection deleted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/saved-searches', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, query, filters } = z
      .object({ name: z.string().min(1), query: z.string().min(1), filters: z.any().optional() })
      .parse(req.body);

    const saved = await prisma.savedSearch.create({
      data: {
        name,
        query,
        filters,
        userId: req.user!.id,
      },
    });
    res.status(201).json({ message: 'Search query saved', savedSearch: saved });
  } catch (err) {
    next(err);
  }
});

export default router;
