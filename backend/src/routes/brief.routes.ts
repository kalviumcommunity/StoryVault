import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BriefStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { getAllowedAccessLevels } from '../lib/accessControl';
import { searchService } from '../services/searchService';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from '../middleware/audit';
import { aiProvider } from '../services/aiProvider';

const router = Router();

async function canReadBrief(
  brief: { id: string; status: BriefStatus; createdById: string },
  req: Request
): Promise<boolean> {
  const hasPermission =
    brief.status === BriefStatus.PUBLISHED ||
    brief.createdById === req.user?.id ||
    req.user?.role === Role.ADMIN ||
    req.user?.role === Role.EDITOR;
  if (!hasPermission) return false;

  const restrictedCitation = await prisma.researchBriefCitation.findFirst({
    where: {
      briefId: brief.id,
      document: { accessLevel: { notIn: getAllowedAccessLevels(req.user?.role) } },
    },
    select: { id: true },
  });
  return !restrictedCitation;
}

const saveBriefSchema = z.object({
  title: z.string().min(3),
  topic: z.string().optional(),
  executiveSummary: z.string().min(10),
  historicalTimeline: z.array(z.any()).optional().default([]),
  keyEntities: z.array(z.any()).optional().default([]),
  previousEvents: z.array(z.any()).optional().default([]),
  supportingEvidence: z.array(z.any()).optional().default([]),
  conflictingAccounts: z.array(z.any()).optional().default([]),
  knowledgeGaps: z.array(z.any()).optional().default([]),
  sourceList: z.array(z.any()).optional().default([]),
  status: z.nativeEnum(BriefStatus).optional().default(BriefStatus.DRAFT),
  citations: z
    .array(
      z.object({
        documentId: z.string(),
        chunkId: z.string().optional(),
        citationIndex: z.number(),
        statementText: z.string(),
        excerptText: z.string(),
        confidenceScore: z.number().optional().default(0.95),
      })
    )
    .optional()
    .default([]),
});

// GET /api/briefs - List briefs
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {
      citations: {
        none: {
          document: {
            accessLevel: { notIn: getAllowedAccessLevels(req.user?.role) },
          },
        },
      },
    };
    if (req.user) {
      where.OR = [{ createdById: req.user.id }, { status: BriefStatus.PUBLISHED }];
    } else {
      where.status = BriefStatus.PUBLISHED;
    }

    const briefs = await prisma.researchBrief.findMany({
      where,
      select: {
        id: true,
        title: true,
        topic: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { citations: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ briefs });
  } catch (err) {
    next(err);
  }
});

// GET /api/briefs/:id - Brief details
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const brief = await prisma.researchBrief.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        citations: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                publicationDate: true,
                originalSourceUrl: true,
                author: { select: { name: true } },
                publication: { select: { name: true } },
              },
            },
          },
          orderBy: { citationIndex: 'asc' },
        },
      },
    });

    if (!brief) throw new AppError('Research brief not found', 404);
    if (!(await canReadBrief(brief, req))) {
      throw new AppError('Research brief not found', 404);
    }

    res.json({ brief });
  } catch (err) {
    next(err);
  }
});

// POST /api/briefs/generate - Build structured research brief from retrieved archive records
router.post('/generate', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topic } = z.object({ topic: z.string().min(3) }).parse(req.body);

    // Retrieve relevant documents using hybrid search
    const searchRes = await searchService.search({ query: topic, limit: 6 }, req.user?.role);
    const docs = searchRes.results;

    if (docs.length === 0) {
      throw new AppError(`No archive records found related to topic: "${topic}". Cannot generate brief without evidence.`, 404);
    }

    const sources = docs.map((d) => ({
      id: d.id,
      title: d.title,
      publicationDate: d.publicationDate,
      authorName: d.author?.name || null,
      publicationName: d.publication?.name || null,
      snippet: d.snippet,
      passage: d.relevantChunk?.content || d.snippet,
      entities: d.entities.map((entity) => ({ name: entity.name, entityType: entity.entityType })),
    }));
    const generated = await aiProvider.generateResearchBrief(topic, sources);
    const sourceAt = (index: number) => {
      const source = sources[index - 1];
      if (!source) throw new AppError('Generated brief referenced an unknown archive source.', 502);
      return source;
    };
    const historyCitationIndices = [
      ...generated.historicalTimeline.flatMap((item) => item.sourceIndices),
      ...generated.keyEntities.flatMap((item) => item.sourceIndices),
      ...generated.previousEvents.flatMap((item) => item.sourceIndices),
      ...generated.supportingEvidence.flatMap((item) => item.sourceIndices),
      ...generated.conflictingAccounts.flatMap((item) => item.sourceIndices),
      ...generated.knowledgeGaps.flatMap((item) => item.sourceIndices),
      ...Array.from(generated.executiveSummary.matchAll(/\[(\d+)\]/g), (match) => Number(match[1])),
    ];
    const usedSourceIndices = Array.from(new Set(historyCitationIndices));

    const historicalTimeline = generated.historicalTimeline.map((item) => {
      const sourceIndex = item.sourceIndices[0];
      const source = sourceAt(sourceIndex);
      return {
        date: source.publicationDate,
        event: `${item.event} [${sourceIndex}]`,
        sourceId: source.id,
        sourceTitle: source.title,
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const keyEntities = generated.keyEntities.map((item) => ({
      name: item.name,
      entityType: item.entityType,
      role: item.role,
      count: new Set(item.sourceIndices.map((index) => sourceAt(index).id)).size,
    }));

    const previousEvents = generated.previousEvents.map((item) => {
      const sourceIndex = item.sourceIndices[0];
      return {
        event: `${item.event} [${sourceIndex}]`,
        date: sourceAt(sourceIndex).publicationDate,
        context: item.context,
        significance: item.significance,
      };
    });

    const supportingEvidence = generated.supportingEvidence.map((item) => {
      const sourceIndices = item.sourceIndices;
      const sourceIndex = sourceIndices[0];
      const source = sourceAt(sourceIndex);
      return {
        claim: `${item.claim} ${sourceIndices.map((index) => `[${index}]`).join(' ')}`,
        citationIndex: sourceIndex,
        sourceId: source.id,
        sourceTitle: source.title,
        confidence: 0.9,
      };
    });

    const conflictingAccounts = generated.conflictingAccounts.map((item) => {
      const sourceTitles = item.sourceIndices.map((index) => `"${sourceAt(index).title}" [${index}]`);
      return {
        topic: item.topic,
        accountA: item.accountA,
        accountB: item.accountB,
        sourceDetails: `Source records: ${sourceTitles.join('; ')}`,
      };
    });

    const knowledgeGaps = generated.knowledgeGaps.map((item) => ({
      question: item.question,
      reasonForUncertainty: `${item.reasonForUncertainty} ${item.sourceIndices.map((index) => `[${index}]`).join(' ')}`,
    }));

    const sourceList = docs.map((d, idx) => ({
      index: idx + 1,
      documentId: d.id,
      title: d.title,
      author: d.author?.name || 'Unknown',
      publication: d.publication?.name || 'News Archive',
      date: d.publicationDate,
      url: `/documents/${d.id}`,
    }));

    const citations = usedSourceIndices.map((index) => {
      const d = docs[index - 1];
      return {
        documentId: d.id,
        chunkId: d.relevantChunk?.id,
        citationIndex: index,
        statementText: `Source cited in the generated brief: "${d.title}".`,
        excerptText: d.relevantChunk?.content || d.snippet,
        confidenceScore: 0.9,
      };
    });

    res.json({
      brief: {
        title: `Research Brief: Investigation into ${topic}`,
        topic,
        executiveSummary: generated.executiveSummary,
        historicalTimeline,
        keyEntities,
        previousEvents,
        supportingEvidence,
        conflictingAccounts,
        knowledgeGaps,
        sourceList,
        citations,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/briefs - Save research brief
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = saveBriefSchema.parse(req.body);
    if (
      data.status === BriefStatus.PUBLISHED &&
      req.user!.role !== Role.ADMIN &&
      req.user!.role !== Role.EDITOR
    ) {
      throw new AppError('Only editors and administrators can publish research briefs.', 403);
    }

    const created = await prisma.researchBrief.create({
      data: {
        title: data.title,
        topic: data.topic,
        executiveSummary: data.executiveSummary,
        historicalTimeline: data.historicalTimeline,
        keyEntities: data.keyEntities,
        previousEvents: data.previousEvents,
        supportingEvidence: data.supportingEvidence,
        conflictingAccounts: data.conflictingAccounts,
        knowledgeGaps: data.knowledgeGaps,
        sourceList: data.sourceList,
        status: data.status,
        createdById: req.user!.id,
        citations: {
          create: data.citations.map((c) => ({
            documentId: c.documentId,
            chunkId: c.chunkId,
            citationIndex: c.citationIndex,
            statementText: c.statementText,
            excerptText: c.excerptText,
            confidenceScore: c.confidenceScore,
          })),
        },
      },
      include: {
        citations: true,
      },
    });

    await recordAuditLog({
      userId: req.user!.id,
      action: 'CREATE_RESEARCH_BRIEF',
      entityType: 'ResearchBrief',
      entityId: created.id,
      details: { title: created.title },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Research brief saved successfully', brief: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/briefs/:id - Update research brief
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = saveBriefSchema.parse(req.body);

    const existing = await prisma.researchBrief.findUnique({ where: { id } });
    if (!existing) throw new AppError('Research brief not found', 404);

    if (existing.createdById !== req.user!.id && req.user!.role !== 'ADMIN' && req.user!.role !== 'EDITOR') {
      throw new AppError('Permission denied. You can only edit your own research briefs.', 403);
    }
    if (
      data.status === BriefStatus.PUBLISHED &&
      existing.status !== BriefStatus.PUBLISHED &&
      req.user!.role !== Role.ADMIN &&
      req.user!.role !== Role.EDITOR
    ) {
      throw new AppError('Only editors and administrators can publish research briefs.', 403);
    }

    const updated = await prisma.researchBrief.update({
      where: { id },
      data: {
        title: data.title,
        topic: data.topic,
        executiveSummary: data.executiveSummary,
        historicalTimeline: data.historicalTimeline,
        keyEntities: data.keyEntities,
        previousEvents: data.previousEvents,
        supportingEvidence: data.supportingEvidence,
        conflictingAccounts: data.conflictingAccounts,
        knowledgeGaps: data.knowledgeGaps,
        sourceList: data.sourceList,
        status: data.status,
      },
    });

    res.json({ message: 'Brief updated successfully', brief: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/briefs/:id - Delete brief
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.researchBrief.findUnique({ where: { id } });
    if (!existing) throw new AppError('Research brief not found', 404);

    if (existing.createdById !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Permission denied.', 403);
    }

    await prisma.researchBrief.delete({ where: { id } });
    res.json({ message: 'Research brief deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/briefs/:id/export - Export markdown / formatted brief
router.get('/:id/export', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const brief = await prisma.researchBrief.findUnique({
      where: { id },
      include: {
        createdBy: true,
        citations: { include: { document: true } },
      },
    });

    if (!brief) throw new AppError('Brief not found', 404);
    if (!(await canReadBrief(brief, req))) {
      throw new AppError('Brief not found', 404);
    }

    const md = `# ${brief.title}
**Status:** ${brief.status} | **Generated by:** ${brief.createdBy.name} (${brief.createdBy.role})
**Date:** ${brief.updatedAt.toISOString().split('T')[0]}

---

## 1. Executive Summary
${brief.executiveSummary}

## 2. Historical Timeline
${(brief.historicalTimeline as any[])?.map((t) => `- **${t.date}**: ${t.event} *(Source: ${t.sourceTitle})*`).join('\n') || 'None recorded.'}

## 3. Key Entities
${(brief.keyEntities as any[])?.map((e) => `- **${e.name}** (${e.entityType}) — Mentioned in ${e.count} archive records`).join('\n') || 'None recorded.'}

## 4. Supporting Evidence
${(brief.supportingEvidence as any[])?.map((s) => `- ${s.claim} [${s.citationIndex}] *(Corroboration: ${(s.confidence * 100).toFixed(0)}%)*`).join('\n') || 'None recorded.'}

## 5. Conflicting Accounts
${(brief.conflictingAccounts as any[])?.map((c) => `### ${c.topic}\n- **Account A:** ${c.accountA}\n- **Account B:** ${c.accountB}\n- **Context:** ${c.sourceDetails}`).join('\n\n') || 'None recorded.'}

## 6. Knowledge Gaps & Unanswered Questions
${(brief.knowledgeGaps as any[])?.map((k) => `- **Question:** ${k.question}\n  *Limitation:* ${k.reasonForUncertainty}`).join('\n') || 'None recorded.'}

## 7. Preserved Source Citations
${brief.citations.map((c) => `[${c.citationIndex}] **${c.document.title}** (${c.document.publicationDate.toISOString().split('T')[0]})\n> "${c.excerptText}"\n`).join('\n')}

---
*Generated by StoryVault AI Media Archive Intelligence Platform.*
`;

    res.json({ markdown: md, brief });
  } catch (err) {
    next(err);
  }
});

export default router;
