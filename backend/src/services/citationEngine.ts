import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export interface VerifiedCitation {
  citationIndex: number;
  documentId: string;
  documentTitle: string;
  authorName: string | null;
  publicationName: string | null;
  publicationDate: string;
  originalSourceUrl: string | null;
  chunkId: string | null;
  excerptText: string;
  isDirectQuote: boolean;
  confidenceScore: number;
  metadataStatus: {
    hasAuthor: boolean;
    hasPublication: boolean;
    hasOriginalUrl: boolean;
  };
}

export class CitationEngine {
  /**
   * Validates that all citation indices in a generated response correspond to actual retrieved source chunks
   */
  async verifyCitations(
    text: string,
    retrievedSources: Array<{ documentId: string; chunkId: string }>
  ): Promise<{
    verifiedCitations: VerifiedCitation[];
    hasInvalidCitations: boolean;
    invalidIndices: number[];
  }> {
    // Extract [1], [2], etc. from text
    const matches = Array.from(text.matchAll(/\[(\d+)\]/g));
    const indices = Array.from(new Set(matches.map((m) => parseInt(m[1], 10)))).sort((a, b) => a - b);

    const verifiedCitations: VerifiedCitation[] = [];
    const invalidIndices: number[] = [];

    for (const idx of indices) {
      const source = retrievedSources[idx - 1];
      if (!source) {
        invalidIndices.push(idx);
        continue;
      }

      const doc = await prisma.document.findUnique({
        where: { id: source.documentId },
        include: {
          author: true,
          publication: true,
          chunks: { where: { id: source.chunkId }, take: 1 },
        },
      });

      if (!doc) {
        invalidIndices.push(idx);
        continue;
      }

      const chunk = doc.chunks[0];
      if (!chunk) {
        invalidIndices.push(idx);
        continue;
      }
      const excerpt = chunk?.content.slice(0, 300) || doc.summary || doc.content.slice(0, 300);

      verifiedCitations.push({
        citationIndex: idx,
        documentId: doc.id,
        documentTitle: doc.title,
        authorName: doc.author?.name || null,
        publicationName: doc.publication?.name || null,
        publicationDate: doc.publicationDate.toISOString().split('T')[0],
        originalSourceUrl: doc.originalSourceUrl,
        chunkId: chunk?.id || null,
        excerptText: excerpt,
        isDirectQuote: false,
        confidenceScore: 0.98,
        metadataStatus: {
          hasAuthor: !!doc.author?.name,
          hasPublication: !!doc.publication?.name,
          hasOriginalUrl: !!doc.originalSourceUrl,
        },
      });
    }

    return {
      verifiedCitations,
      hasInvalidCitations: invalidIndices.length > 0,
      invalidIndices,
    };
  }

  /**
   * Highlights occurrences of a search passage inside a document's full content
   */
  highlightPassages(fullContent: string, terms: string[]): string {
    if (!terms || terms.length === 0) return fullContent;
    let result = fullContent;
    for (const term of terms) {
      if (!term || term.length < 3) continue;
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark class="bg-amber-100 text-amber-900 px-1 rounded font-medium">$1</mark>');
    }
    return result;
  }
}

export const citationEngine = new CitationEngine();
