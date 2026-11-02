import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth';
import { searchService } from '../services/searchService';
import { aiProvider, RetrievedChunkContext } from '../services/aiProvider';
import { citationEngine } from '../services/citationEngine';
import { prisma } from '../lib/prisma';
import { recordAuditLog } from '../middleware/audit';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const askSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters long'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    ).max(12)
    .optional(),
});

// POST /api/research/ask - Grounded research assistant query
router.post('/ask', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, history = [] } = askSchema.parse(req.body);

    // Step 1 & 2: Search for most relevant chunks respecting user role clearance
    const searchResult = await searchService.search(
      {
        query,
        mode: 'hybrid',
        limit: 5,
      },
      req.user?.role
    );

    // Step 3: Map search results to chunk contexts
    const chunkContexts: RetrievedChunkContext[] = [];

    for (const item of searchResult.results) {
      if (item.relevantChunk) {
        chunkContexts.push({
          chunkId: item.relevantChunk.id,
          documentId: item.id,
          documentTitle: item.title,
          authorName: item.author?.name,
          publicationName: item.publication?.name,
          publicationDate: item.publicationDate,
          content: item.relevantChunk.content,
          score: item.score,
        });
      }
    }

    // Step 4: Generate strictly grounded research answer
    const generated = await aiProvider.generateResearchAnswer(query, chunkContexts, history);

    // Step 5: Verify citation integrity against retrieved archive records
    const citationCheck = await citationEngine.verifyCitations(
      generated.answer,
      chunkContexts.map(({ documentId, chunkId }) => ({ documentId, chunkId }))
    );
    if (citationCheck.hasInvalidCitations) {
      throw new AppError('Gemini returned a citation that could not be verified against retrieved records.', 502);
    }

    if (req.user) {
      await recordAuditLog({
        userId: req.user.id,
        action: 'RESEARCH_QUERY',
        entityType: 'ResearchQuery',
        details: { query, sourcesRetrievedCount: chunkContexts.length },
        ipAddress: req.ip,
      });
    }

    res.json({
      answer: generated.answer,
      citations: citationCheck.verifiedCitations,
      confidenceScore: generated.confidenceScore,
      hasSufficientEvidence: generated.hasSufficientEvidence,
      unsupportedClaims: generated.unsupportedClaims,
      providerMode: generated.providerMode,
      retrievedSources: searchResult.results.map((r, idx) => ({
        index: idx + 1,
        id: r.id,
        title: r.title,
        author: r.author?.name || 'Unknown',
        publication: r.publication?.name || 'Archive Record',
        date: r.publicationDate,
        documentType: r.documentType,
        snippet: r.snippet,
        score: r.score,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
