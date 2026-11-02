import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/timeline - Chronological events extracted from archive records
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topicId = req.query.topicId as string | undefined;
    const entityId = req.query.entityId as string | undefined;

    const where: any = {
      status: 'INDEXED',
      accessLevel: 'PUBLIC', // Timeline shows public verified records by default
    };

    if (topicId) where.topics = { some: { id: topicId } };
    if (entityId) where.entities = { some: { entityId } };

    const docs = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        documentType: true,
        publicationDate: true,
        summary: true,
        author: { select: { name: true } },
        publication: { select: { name: true } },
        entities: {
          select: {
            relevanceScore: true,
            entity: { select: { id: true, name: true, entityType: true } },
          },
          take: 4,
        },
      },
      orderBy: { publicationDate: 'asc' },
      take: 50,
    });

    const events = docs.map((d) => ({
      id: d.id,
      date: d.publicationDate.toISOString().split('T')[0],
      year: d.publicationDate.getFullYear(),
      title: d.title,
      summary: d.summary || 'Archive event documented in media records.',
      documentType: d.documentType,
      author: d.author?.name || 'Archive Dispatch',
      publication: d.publication?.name || 'Historical Press',
      documentId: d.id,
      entities: d.entities.map((e) => ({
        id: e.entity.id,
        name: e.entity.name,
        type: e.entity.entityType,
      })),
      isExtractedFact: true,
      confidence: 1.0,
    }));

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// GET /api/timeline/entities - Entity relationship network & graph
router.get('/entities', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch entities that have mentions
    const entities = await prisma.entity.findMany({
      where: {
        documentEntities: {
          some: {
            document: { status: 'INDEXED', accessLevel: 'PUBLIC' },
          },
        },
      },
      select: {
        id: true,
        name: true,
        entityType: true,
        description: true,
        mentionsCount: true,
        documentEntities: {
          where: {
            document: { status: 'INDEXED', accessLevel: 'PUBLIC' },
          },
          select: {
            documentId: true,
            relevanceScore: true,
            document: { select: { title: true, publicationDate: true } },
          },
          take: 6,
        },
      },
      orderBy: { mentionsCount: 'desc' },
      take: 30,
    });

    // Compute co-occurrence edges between entities sharing documents
    const docToEntities = new Map<string, string[]>();
    for (const ent of entities) {
      for (const de of ent.documentEntities) {
        if (!docToEntities.has(de.documentId)) {
          docToEntities.set(de.documentId, []);
        }
        docToEntities.get(de.documentId)!.push(ent.id);
      }
    }

    const edgeMap = new Map<string, { source: string; target: string; sharedDocs: number; docIds: string[] }>();
    for (const [docId, entIds] of docToEntities.entries()) {
      for (let i = 0; i < entIds.length; i++) {
        for (let j = i + 1; j < entIds.length; j++) {
          const u = entIds[i];
          const v = entIds[j];
          const key = u < v ? `${u}--${v}` : `${v}--${u}`;
          const existing = edgeMap.get(key);
          if (existing) {
            existing.sharedDocs += 1;
            if (!existing.docIds.includes(docId)) existing.docIds.push(docId);
          } else {
            edgeMap.set(key, {
              source: u < v ? u : v,
              target: u < v ? v : u,
              sharedDocs: 1,
              docIds: [docId],
            });
          }
        }
      }
    }

    const nodes = entities.map((e) => ({
      id: e.id,
      label: e.name,
      type: e.entityType,
      mentions: e.mentionsCount || e.documentEntities.length,
      description: e.description,
      relatedDocuments: e.documentEntities.map((de) => ({
        id: de.documentId,
        title: de.document.title,
        date: de.document.publicationDate.toISOString().split('T')[0],
      })),
    }));

    const links = Array.from(edgeMap.values()).map((edge) => ({
      ...edge,
      isVerifiedCooccurrence: true,
      isInferred: false,
    }));

    res.json({ nodes, links });
  } catch (err) {
    next(err);
  }
});

export default router;
