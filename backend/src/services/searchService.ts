import { AccessLevel, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getAllowedAccessLevels } from '../lib/accessControl';
import { aiProvider, cosineSimilarity } from './aiProvider';
import { AppError } from '../middleware/errorHandler';

const QUERY_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'had',
  'has',
  'have',
  'how',
  'in',
  'into',
  'is',
  'it',
  'me',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'with',
  'would',
  'you',
]);

export interface SearchFilters {
  query?: string;
  mode?: 'hybrid' | 'keyword' | 'semantic';
  startDate?: string;
  endDate?: string;
  authorId?: string;
  publicationId?: string;
  documentType?: string;
  topicId?: string;
  entityId?: string;
  accessLevel?: AccessLevel;
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  documentType: string;
  accessLevel: string;
  publicationDate: string;
  author: { id: string; name: string } | null;
  publication: { id: string; name: string } | null;
  topics: Array<{ id: string; name: string }>;
  entities: Array<{ id: string; name: string; entityType: string }>;
  snippet: string;
  score: number;
  searchModeMatch: 'keyword' | 'semantic' | 'hybrid';
  relevantChunk?: {
    id: string;
    chunkIndex: number;
    content: string;
  };
}

export class SearchService {
  async search(filters: SearchFilters, userRole?: Role) {
    const rawQuery = (filters.query || '').trim();
    const mode = filters.mode || 'hybrid';
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 10));
    const allowedAccess = getAllowedAccessLevels(userRole);

    // Common WHERE filters
    const baseWhere: any = {
      status: 'INDEXED',
      accessLevel: { in: allowedAccess },
    };

    if (filters.accessLevel && allowedAccess.includes(filters.accessLevel)) {
      baseWhere.accessLevel = filters.accessLevel;
    }
    if (filters.startDate) {
      baseWhere.publicationDate = { ...(baseWhere.publicationDate || {}), gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      baseWhere.publicationDate = { ...(baseWhere.publicationDate || {}), lte: new Date(filters.endDate) };
    }
    if (filters.authorId) {
      baseWhere.authorId = filters.authorId;
    }
    if (filters.publicationId) {
      baseWhere.publicationId = filters.publicationId;
    }
    if (filters.documentType) {
      baseWhere.documentType = filters.documentType;
    }
    if (filters.topicId) {
      baseWhere.topics = { some: { id: filters.topicId } };
    }
    if (filters.entityId) {
      baseWhere.entities = { some: { entityId: filters.entityId } };
    }

    // If query is empty, return latest documents matching filters
    if (!rawQuery) {
      const [total, docs] = await Promise.all([
        prisma.document.count({ where: baseWhere }),
        prisma.document.findMany({
          where: baseWhere,
          include: {
            author: { select: { id: true, name: true } },
            publication: { select: { id: true, name: true } },
            topics: { select: { id: true, name: true } },
            entities: { include: { entity: true }, take: 5 },
            chunks: { take: 1, orderBy: { chunkIndex: 'asc' } },
          },
          orderBy: { publicationDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const results: SearchResultItem[] = docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        documentType: doc.documentType,
        accessLevel: doc.accessLevel,
        publicationDate: doc.publicationDate.toISOString().split('T')[0],
        author: doc.author,
        publication: doc.publication,
        topics: doc.topics,
        entities: doc.entities.map((e) => ({
          id: e.entity.id,
          name: e.entity.name,
          entityType: e.entity.entityType,
        })),
        snippet: doc.summary || doc.content.slice(0, 220) + '...',
        score: 1.0,
        searchModeMatch: 'keyword',
        relevantChunk: doc.chunks[0]
          ? {
              id: doc.chunks[0].id,
              chunkIndex: doc.chunks[0].chunkIndex,
              content: doc.chunks[0].content,
            }
          : undefined,
      }));

      return {
        results,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        searchModeUsed: mode,
        semanticIndexAvailable: true,
      };
    }

    // Step 3: Keyword / Full-Text Search
    const keywordResultsMap = new Map<string, { rank: number; doc: any; snippet: string }>();

    if (mode === 'keyword' || mode === 'hybrid') {
      const disjunctiveQuery = rawQuery
        .match(/[a-z0-9]+/gi)
        ?.filter((term) => !QUERY_STOP_WORDS.has(term.toLowerCase()))
        .join(' | ');

      // Use PostgreSQL Full-Text Search with ts_rank
      try {
        let rawFtsResults: any[] = await prisma.$queryRaw`
          SELECT 
            d.id,
            ts_rank(to_tsvector('english', d.title || ' ' || d.content || ' ' || coalesce(d.summary, '')), plainto_tsquery('english', ${rawQuery})) as rank,
            ts_headline('english', d.content, plainto_tsquery('english', ${rawQuery}), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') as headline
          FROM documents d
          WHERE 
            d.status = 'INDEXED'
            AND d."accessLevel" = ANY(${allowedAccess}::"AccessLevel"[])
            AND to_tsvector('english', d.title || ' ' || d.content || ' ' || coalesce(d.summary, '')) @@ plainto_tsquery('english', ${rawQuery})
          ORDER BY rank DESC
          LIMIT 50;
        `;

        if (rawFtsResults.length === 0 && disjunctiveQuery) {
          rawFtsResults = await prisma.$queryRaw`
            SELECT
              d.id,
              ts_rank(
                to_tsvector('english', d.title || ' ' || d.content || ' ' || coalesce(d.summary, '')),
                to_tsquery('english', ${disjunctiveQuery})
              ) as rank,
              ts_headline(
                'english',
                d.content,
                to_tsquery('english', ${disjunctiveQuery}),
                'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15'
              ) as headline
            FROM documents d
            WHERE
              d.status = 'INDEXED'
              AND d."accessLevel" = ANY(${allowedAccess}::"AccessLevel"[])
              AND to_tsvector('english', d.title || ' ' || d.content || ' ' || coalesce(d.summary, ''))
                @@ to_tsquery('english', ${disjunctiveQuery})
            ORDER BY rank DESC
            LIMIT 50;
          `;
        }

        if (rawFtsResults && rawFtsResults.length > 0) {
          const docIds = rawFtsResults.map((r) => r.id);
          const fullDocs = await prisma.document.findMany({
            where: { id: { in: docIds }, ...baseWhere },
            include: {
              author: { select: { id: true, name: true } },
              publication: { select: { id: true, name: true } },
              topics: { select: { id: true, name: true } },
              entities: { include: { entity: true }, take: 5 },
              chunks: { take: 1, orderBy: { chunkIndex: 'asc' } },
            },
          });

          const docMap = new Map(fullDocs.map((d) => [d.id, d]));
          rawFtsResults.forEach((r, idx) => {
            const doc = docMap.get(r.id);
            if (doc) {
              keywordResultsMap.set(r.id, {
                rank: idx + 1,
                doc,
                snippet: r.headline || doc.summary || doc.content.slice(0, 220),
              });
            }
          });
        }
      } catch {
        // Fallback to ILIKE if tsvector query fails
        const fallbackDocs = await prisma.document.findMany({
          where: {
            ...baseWhere,
            OR: [
              { title: { contains: rawQuery, mode: 'insensitive' } },
              { content: { contains: rawQuery, mode: 'insensitive' } },
              { summary: { contains: rawQuery, mode: 'insensitive' } },
            ],
          },
          include: {
            author: { select: { id: true, name: true } },
            publication: { select: { id: true, name: true } },
            topics: { select: { id: true, name: true } },
            entities: { include: { entity: true }, take: 5 },
            chunks: { take: 1, orderBy: { chunkIndex: 'asc' } },
          },
          take: 50,
        });

        fallbackDocs.forEach((d, idx) => {
          keywordResultsMap.set(d.id, {
            rank: idx + 1,
            doc: d,
            snippet: d.summary || d.content.slice(0, 220),
          });
        });
      }
    }

    // Step 4: Semantic Search using vector embeddings
    const semanticResultsMap = new Map<
      string,
      { rank: number; score: number; doc: any; bestChunk: any }
    >();
    let semanticIndexAvailable = true;

    if (mode === 'semantic' || mode === 'hybrid') {
      const queryEmbedding = await aiProvider.getEmbedding(rawQuery, 'query');

      // Load candidate chunks belonging to allowed documents
      const candidateChunks = await prisma.documentChunk.findMany({
        where: {
          document: baseWhere,
        },
        include: {
          document: {
            include: {
              author: { select: { id: true, name: true } },
              publication: { select: { id: true, name: true } },
              topics: { select: { id: true, name: true } },
              entities: { include: { entity: true }, take: 5 },
            },
          },
        },
      });

      const embeddedChunks = candidateChunks.filter(
        (chunk) => chunk.embedding && Array.isArray(chunk.embedding)
      );
      semanticIndexAvailable =
        candidateChunks.length === 0 ||
        (embeddedChunks.length === candidateChunks.length &&
          embeddedChunks.every((chunk) => (chunk.embedding as number[]).length === queryEmbedding.length));

      if (!semanticIndexAvailable && mode === 'semantic') {
        throw new AppError(
          'Gemini semantic embeddings are missing or incompatible. Run the backend embedding reindex command before semantic search.',
          503
        );
      }

      const scoredChunks: Array<{ score: number; chunk: any; doc: any }> = [];

      for (const ch of semanticIndexAvailable ? embeddedChunks : []) {
        if (ch.embedding && Array.isArray(ch.embedding)) {
          const sim = cosineSimilarity(queryEmbedding, ch.embedding as number[]);
          if (sim > 0.28) {
            scoredChunks.push({ score: sim, chunk: ch, doc: ch.document });
          }
        }
      }

      scoredChunks.sort((a, b) => b.score - a.score);

      // Deduplicate by document ID, keeping best chunk
      const seenDocIds = new Set<string>();
      let semRank = 1;
      for (const item of scoredChunks) {
        if (!seenDocIds.has(item.doc.id)) {
          seenDocIds.add(item.doc.id);
          semanticResultsMap.set(item.doc.id, {
            rank: semRank++,
            score: item.score,
            doc: item.doc,
            bestChunk: item.chunk,
          });
          if (semRank > 50) break;
        }
      }
    }

    // Step 5: Reciprocal Rank Fusion (RRF) Ranking
    // RRF Score = 1 / (60 + keywordRank) + 1 / (60 + semanticRank)
    const combinedScores = new Map<
      string,
      {
        doc: any;
        score: number;
        snippet: string;
        matchType: 'keyword' | 'semantic' | 'hybrid';
        bestChunk?: any;
      }
    >();

    const kConstant = 60;

    // Collect all unique doc IDs
    const allDocIds = new Set([...keywordResultsMap.keys(), ...semanticResultsMap.keys()]);

    for (const docId of allDocIds) {
      const kw = keywordResultsMap.get(docId);
      const sem = semanticResultsMap.get(docId);

      let rrfScore = 0;
      let matchType: 'keyword' | 'semantic' | 'hybrid' = 'keyword';
      let doc = kw?.doc || sem?.doc;
      let snippet = kw?.snippet || sem?.bestChunk?.content.slice(0, 220) || doc?.summary || '';
      let bestChunk = sem?.bestChunk || doc?.chunks?.[0];

      if (kw && sem) {
        rrfScore = 1 / (kConstant + kw.rank) + 1 / (kConstant + sem.rank);
        matchType = 'hybrid';
      } else if (kw) {
        rrfScore = 1 / (kConstant + kw.rank);
        matchType = 'keyword';
      } else if (sem) {
        rrfScore = 1 / (kConstant + sem.rank);
        matchType = 'semantic';
      }

      combinedScores.set(docId, {
        doc,
        score: rrfScore,
        snippet,
        matchType,
        bestChunk,
      });
    }

    // Sort descending by combined RRF score
    const sorted = Array.from(combinedScores.values()).sort((a, b) => b.score - a.score);

    const total = sorted.length;
    const paginated = sorted.slice((page - 1) * limit, page * limit);

    const results: SearchResultItem[] = paginated.map((item) => ({
      id: item.doc.id,
      title: item.doc.title,
      slug: item.doc.slug,
      documentType: item.doc.documentType,
      accessLevel: item.doc.accessLevel,
      publicationDate: item.doc.publicationDate.toISOString().split('T')[0],
      author: item.doc.author,
      publication: item.doc.publication,
      topics: item.doc.topics || [],
      entities: (item.doc.entities || []).map((e: any) => ({
        id: e.entity.id,
        name: e.entity.name,
        entityType: e.entity.entityType,
      })),
      snippet: item.snippet,
      score: parseFloat(item.score.toFixed(4)),
      searchModeMatch: item.matchType,
      relevantChunk: item.bestChunk
        ? {
            id: item.bestChunk.id,
            chunkIndex: item.bestChunk.chunkIndex,
            content: item.bestChunk.content,
          }
        : undefined,
    }));

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      searchModeUsed: mode,
      semanticIndexAvailable,
    };
  }
}

export const searchService = new SearchService();
