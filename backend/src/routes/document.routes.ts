import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AccessLevel, DocumentStatus, DocumentType, EntityType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { getAllowedAccessLevels } from '../lib/accessControl';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from '../middleware/audit';
import { citationEngine } from '../services/citationEngine';
import { aiProvider } from '../services/aiProvider';

const router = Router();

const createDocSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  documentType: z.nativeEnum(DocumentType).default(DocumentType.ARTICLE),
  accessLevel: z.nativeEnum(AccessLevel).default(AccessLevel.PUBLIC),
  publicationDate: z.string().default(() => new Date().toISOString()),
  originalSourceUrl: z.string().url().optional().or(z.literal('')),
  originalFilename: z.string().optional(),
  authorName: z.string().optional(),
  publicationName: z.string().optional(),
  topics: z.array(z.string()).optional(),
  provenance: z.string().optional(),
});

// GET /api/documents - List documents with filtering & pagination
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '12', 10)));
    const documentType = req.query.documentType as DocumentType | undefined;
    const authorId = req.query.authorId as string | undefined;
    const topicId = req.query.topicId as string | undefined;

    const allowedAccess = getAllowedAccessLevels(req.user?.role);

    const where: any = {
      status: DocumentStatus.INDEXED,
      accessLevel: { in: allowedAccess },
    };

    if (documentType) where.documentType = documentType;
    if (authorId) where.authorId = authorId;
    if (topicId) where.topics = { some: { id: topicId } };

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          documentType: true,
          accessLevel: true,
          publicationDate: true,
          summary: true,
          wordCount: true,
          provenance: true,
          author: { select: { id: true, name: true, organization: true } },
          publication: { select: { id: true, name: true } },
          topics: { select: { id: true, name: true, slug: true } },
          entities: {
            select: {
              relevanceScore: true,
              entity: { select: { id: true, name: true, entityType: true } },
            },
            take: 4,
          },
          _count: { select: { chunks: true } },
        },
        orderBy: { publicationDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      documents: documents.map((d) => ({
        ...d,
        publicationDate: d.publicationDate.toISOString().split('T')[0],
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id - Single document detail
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const highlightTerms = req.query.highlight
      ? (req.query.highlight as string).split(',').map((t) => t.trim())
      : [];

    const allowedAccess = getAllowedAccessLevels(req.user?.role);

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        author: true,
        publication: true,
        topics: true,
        entities: {
          include: { entity: true },
          orderBy: { relevanceScore: 'desc' },
        },
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: { id: true, chunkIndex: true, content: true, tokenCount: true },
        },
      },
    });

    if (!doc) {
      throw new AppError('Document record not found in archive.', 404);
    }

    // RBAC validation: Check if user's role permits viewing this document
    if (!allowedAccess.includes(doc.accessLevel)) {
      throw new AppError(
        `Access restricted: Document has classification '${doc.accessLevel}'. Your current role does not have security clearance to inspect this record.`,
        403,
        { requiredAccess: doc.accessLevel, userRole: req.user?.role || 'ANONYMOUS' }
      );
    }

    // Related documents based on shared topics or author
    const topicIds = doc.topics.map((t) => t.id);
    const relatedDocs = await prisma.document.findMany({
      where: {
        id: { not: doc.id },
        accessLevel: { in: allowedAccess },
        OR: [{ authorId: doc.authorId }, { topics: { some: { id: { in: topicIds } } } }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        documentType: true,
        publicationDate: true,
        summary: true,
        author: { select: { id: true, name: true } },
      },
      take: 4,
      orderBy: { publicationDate: 'desc' },
    });

    const highlightedContent =
      highlightTerms.length > 0
        ? citationEngine.highlightPassages(doc.content, highlightTerms)
        : doc.content;

    res.json({
      document: {
        ...doc,
        publicationDate: doc.publicationDate.toISOString().split('T')[0],
        highlightedContent,
      },
      relatedDocuments: relatedDocs.map((r) => ({
        ...r,
        publicationDate: r.publicationDate.toISOString().split('T')[0],
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents - Create archive document (Archivist or Admin)
router.post(
  '/',
  authenticate,
  requireRole(Role.ARCHIVIST, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createDocSchema.parse(req.body);

      // Generate content hash
      const crypto = await import('crypto');
      const contentHash = crypto.createHash('sha256').update(data.content).digest('hex');

      const existing = await prisma.document.findUnique({ where: { contentHash } });
      if (existing) {
        throw new AppError('A document with identical content already exists.', 409);
      }

      const slugBase = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
      const slug = `${slugBase}-${Date.now().toString(36)}`;

      const { ingestionService } = await import('../services/ingestionService');
      const chunks = ingestionService.chunkText(data.content);
      const analysis = await aiProvider.analyzeDocument(data.title, data.content);
      const chunkEmbeddings: number[][] = [];
      for (const chunk of chunks) {
        chunkEmbeddings.push(await aiProvider.getEmbedding(chunk.content, 'document', data.title));
      }

      let authorId: string | undefined;
      if (data.authorName) {
        const author = await prisma.author.upsert({
          where: { name: data.authorName },
          update: {},
          create: { name: data.authorName },
        });
        authorId = author.id;
      }

      let publicationId: string | undefined;
      if (data.publicationName) {
        const pub = await prisma.publication.upsert({
          where: { name: data.publicationName },
          update: {},
          create: { name: data.publicationName },
        });
        publicationId = pub.id;
      }

      const wordCount = data.content.trim().split(/\s+/).length;

      const doc = await prisma.document.create({
        data: {
          title: data.title,
          slug,
          content: data.content,
          extractedText: data.content,
          summary: analysis.summary,
          documentType: data.documentType,
          accessLevel: data.accessLevel,
          publicationDate: new Date(data.publicationDate),
          originalSourceUrl: data.originalSourceUrl || null,
          originalFilename: data.originalFilename,
          contentHash,
          provenance: data.provenance || 'Manually added by Archivist',
          wordCount,
          authorId,
          publicationId,
        },
      });

      // Persist precomputed Gemini embeddings so provider failures cannot leave partial documents.
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        await prisma.documentChunk.create({
          data: {
            documentId: doc.id,
            chunkIndex: i + 1,
            content: c.content,
            startChar: c.start,
            endChar: c.end,
            tokenCount: Math.ceil(c.content.length / 4),
            embedding: chunkEmbeddings[i],
          },
        });
      }

      const topicNames = Array.from(new Set([...(data.topics || []), ...analysis.topics]));
      for (const topicName of topicNames) {
        const topicSlug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const topic = await prisma.topic.upsert({
          where: { slug: topicSlug },
          update: {},
          create: { name: topicName, slug: topicSlug },
        });
        await prisma.document.update({
          where: { id: doc.id },
          data: { topics: { connect: { id: topic.id } } },
        });
      }

      for (const extractedEntity of analysis.entities) {
        const entity = await prisma.entity.upsert({
          where: {
            name_entityType: {
              name: extractedEntity.name,
              entityType: extractedEntity.entityType as EntityType,
            },
          },
          update: {},
          create: {
            name: extractedEntity.name,
            entityType: extractedEntity.entityType as EntityType,
          },
        });
        await prisma.documentEntity.upsert({
          where: { documentId_entityId: { documentId: doc.id, entityId: entity.id } },
          update: { contextSnippet: extractedEntity.context },
          create: {
            documentId: doc.id,
            entityId: entity.id,
            contextSnippet: extractedEntity.context,
          },
        });
      }

      await recordAuditLog({
        userId: req.user!.id,
        action: 'CREATE_DOCUMENT',
        entityType: 'Document',
        entityId: doc.id,
        details: { title: doc.title, documentType: doc.documentType },
        ipAddress: req.ip,
      });

      res.status(201).json({ message: 'Document created and indexed successfully', document: doc });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/documents/:id - Delete document (Admin only)
router.delete(
  '/:id',
  authenticate,
  requireRole(Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new AppError('Document not found', 404);

      await prisma.document.delete({ where: { id } });

      await recordAuditLog({
        userId: req.user!.id,
        action: 'DELETE_DOCUMENT',
        entityType: 'Document',
        entityId: id,
        details: { title: doc.title },
        ipAddress: req.ip,
      });

      res.json({ message: 'Document deleted successfully from archive.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
