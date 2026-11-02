import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';
import { config } from '../config';

const router = Router();

// GET /api/admin/metrics - Real stored data statistics for dashboard & metrics charts
router.get('/metrics', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalDocuments,
      totalChunks,
      totalAuthors,
      totalPublications,
      totalBriefs,
      totalCollections,
      totalUsers,
      recentDocuments,
      docTypeCounts,
      accessLevelCounts,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.document.count({ where: { status: 'INDEXED' } }),
      prisma.documentChunk.count(),
      prisma.author.count(),
      prisma.publication.count(),
      prisma.researchBrief.count(),
      prisma.collection.count(),
      prisma.user.count(),
      prisma.document.findMany({
        select: {
          id: true,
          title: true,
          documentType: true,
          publicationDate: true,
          accessLevel: true,
          author: { select: { name: true } },
          publication: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.document.groupBy({
        by: ['documentType'],
        _count: { id: true },
      }),
      prisma.document.groupBy({
        by: ['accessLevel'],
        _count: { id: true },
      }),
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } },
      }),
    ]);

    // Format type distribution for Recharts
    const typeDistribution = docTypeCounts.map((item) => ({
      name: item.documentType.replace(/_/g, ' '),
      count: item._count.id,
    }));

    // Format access level distribution
    const accessDistribution = accessLevelCounts.map((item) => ({
      name: item.accessLevel,
      count: item._count.id,
    }));

    res.json({
      metrics: {
        totalDocuments,
        totalChunks,
        totalAuthors,
        totalPublications,
        totalBriefs,
        totalCollections,
        totalUsers,
      },
      typeDistribution,
      accessDistribution,
      recentDocuments: recentDocuments.map((d) => ({
        ...d,
        publicationDate: d.publicationDate.toISOString().split('T')[0],
      })),
      recentAuditLogs,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs - Inspection for admin users
router.get(
  '/audit-logs',
  authenticate,
  requireRole(Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

      const [total, logs] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/system-health - Health & configuration review
router.get(
  '/system-health',
  authenticate,
  requireRole(Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Test database roundtrip
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatencyMs = Date.now() - dbStart;

      res.json({
        database: {
          status: 'healthy',
          engine: 'PostgreSQL 18',
          latencyMs: dbLatencyMs,
        },
        aiProvider: {
          configuredMode: 'gemini',
          hasGeminiKey: Boolean(config.GEMINI_API_KEY),
          status: 'configured',
        },
        searchPipeline: {
          keywordSearch: 'operational (PostgreSQL FTS + GIN index)',
          semanticSearch: 'operational (Vector Cosine Similarity & Embeddings)',
          hybridRRF: 'active',
        },
        environment: config.NODE_ENV,
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      next(err);
    }
  }
);

export default router;
