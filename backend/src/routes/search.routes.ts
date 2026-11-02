import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AccessLevel } from '@prisma/client';
import { searchService } from '../services/searchService';
import { optionalAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

const searchSchema = z.object({
  query: z.string().optional().default(''),
  mode: z.enum(['hybrid', 'keyword', 'semantic']).optional().default('hybrid'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  authorId: z.string().optional(),
  publicationId: z.string().optional(),
  documentType: z.string().optional(),
  topicId: z.string().optional(),
  entityId: z.string().optional(),
  accessLevel: z.nativeEnum(AccessLevel).optional(),
  page: z.number().or(z.string().transform((v) => parseInt(v, 10))).optional().default(1),
  limit: z.number().or(z.string().transform((v) => parseInt(v, 10))).optional().default(10),
});

// GET & POST /api/search
router.all('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawData = req.method === 'POST' ? req.body : req.query;
    const filters = searchSchema.parse(rawData);

    const result = await searchService.search(filters, req.user?.role);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/search/suggestions
router.get('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const [docs, topics, entities, authors] = await Promise.all([
      prisma.document.findMany({
        where: {
          status: 'INDEXED',
          accessLevel: 'PUBLIC',
          title: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, title: true },
        take: 4,
      }),
      prisma.topic.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
          documents: { some: { status: 'INDEXED', accessLevel: 'PUBLIC' } },
        },
        select: { id: true, name: true },
        take: 3,
      }),
      prisma.entity.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
          documentEntities: {
            some: { document: { status: 'INDEXED', accessLevel: 'PUBLIC' } },
          },
        },
        select: { id: true, name: true, entityType: true },
        take: 3,
      }),
      prisma.author.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
          documents: { some: { status: 'INDEXED', accessLevel: 'PUBLIC' } },
        },
        select: { id: true, name: true },
        take: 3,
      }),
    ]);

    const suggestions = [
      ...docs.map((d) => ({ text: d.title, type: 'document', id: d.id })),
      ...topics.map((t) => ({ text: t.name, type: 'topic', id: t.id })),
      ...entities.map((e) => ({ text: `${e.name} (${e.entityType})`, type: 'entity', id: e.id })),
      ...authors.map((a) => ({ text: a.name, type: 'author', id: a.id })),
    ];

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
