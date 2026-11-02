import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { parse as parseCsv } from 'csv-parse/sync';
import { AccessLevel, DocumentStatus, DocumentType, EntityType, IngestionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { aiProvider } from './aiProvider';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

export interface IngestionOptions {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
  userId?: string;
  customMetadata?: {
    title?: string;
    authorName?: string;
    publicationName?: string;
    publicationDate?: string;
    documentType?: DocumentType;
    accessLevel?: AccessLevel;
    topics?: string[];
    provenance?: string;
  };
}

export class IngestionService {
  /**
   * Split text into overlapping chunks
   */
  chunkText(text: string, chunkSize = 1000, overlap = 200): Array<{ content: string; start: number; end: number }> {
    const chunks: Array<{ content: string; start: number; end: number }> = [];
    if (!text || text.trim().length === 0) return chunks;

    const clean = text.replace(/\r\n/g, '\n');
    let start = 0;

    while (start < clean.length) {
      let end = start + chunkSize;
      if (end >= clean.length) {
        chunks.push({
          content: clean.slice(start).trim(),
          start,
          end: clean.length,
        });
        break;
      }

      // Try to break on paragraph or sentence boundary
      const lookback = clean.slice(start, end);
      const lastParagraph = lookback.lastIndexOf('\n\n');
      const lastSentence = lookback.lastIndexOf('. ');

      let splitPoint = end;
      if (lastParagraph > chunkSize * 0.6) {
        splitPoint = start + lastParagraph + 2;
      } else if (lastSentence > chunkSize * 0.6) {
        splitPoint = start + lastSentence + 2;
      }

      const chunkContent = clean.slice(start, splitPoint).trim();
      if (chunkContent.length > 20) {
        chunks.push({
          content: chunkContent,
          start,
          end: splitPoint,
        });
      }

      start = splitPoint - overlap;
      if (start <= chunks[chunks.length - 1]?.start) {
        start = splitPoint;
      }
    }

    return chunks;
  }

  /**
   * Extract raw text from buffer based on file extension / mime type
   */
  async extractText(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    const ext = path.extname(filename).toLowerCase();

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      try {
        const data = await pdfParse(buffer);
        return data.text || '';
      } catch (err: any) {
        throw new AppError(`Failed to parse PDF document: ${err.message}`, 400);
      }
    }

    if (ext === '.csv' || mimeType === 'text/csv') {
      try {
        const records = parseCsv(buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
        });
        // Convert rows to readable markdown document
        return records
          .map((row: any, idx: number) => {
            return `Record #${idx + 1}:\n` + Object.entries(row).map(([k, v]) => `- ${k}: ${v}`).join('\n');
          })
          .join('\n\n---\n\n');
      } catch (err: any) {
        throw new AppError(`Failed to parse CSV file: ${err.message}`, 400);
      }
    }

    // Default to plain text / Markdown
    return buffer.toString('utf-8');
  }

  /**
   * Ingest a document file with SHA-256 hash deduplication, text chunking, and embedding generation
   */
  async ingestFile(opts: IngestionOptions) {
    const contentHash = crypto.createHash('sha256').update(opts.buffer).digest('hex');

    // Step 1: Check for duplicate content
    const existingDoc = await prisma.document.findUnique({
      where: { contentHash },
      include: { author: true, publication: true },
    });

    if (existingDoc) {
      throw new AppError(
        `Duplicate document rejected: File has identical content to existing record "${existingDoc.title}" (ID: ${existingDoc.id})`,
        409,
        { existingDocumentId: existingDoc.id, contentHash }
      );
    }

    // Create IngestionJob record
    const job = await prisma.ingestionJob.create({
      data: {
        filename: opts.filename,
        fileSize: opts.size,
        fileType: opts.mimeType || path.extname(opts.filename),
        contentHash,
        status: IngestionStatus.PROCESSING,
        startedAt: new Date(),
        createdById: opts.userId,
      },
    });

    try {
      // Step 2: Extract text
      const extractedText = await this.extractText(opts.filename, opts.buffer, opts.mimeType);
      if (!extractedText || extractedText.trim().length === 0) {
        throw new AppError('The uploaded file contains no extractable text.', 400);
      }

      // Step 3: Metadata resolution
      const title =
        opts.customMetadata?.title ||
        path.basename(opts.filename, path.extname(opts.filename)).replace(/[-_]/g, ' ');

      const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
      const uniqueSlug = `${slugBase}-${Date.now().toString(36)}`;

      const publicationDate = opts.customMetadata?.publicationDate
        ? new Date(opts.customMetadata.publicationDate)
        : new Date();

      const analysis = await aiProvider.analyzeDocument(title, extractedText);
      const wordCount = extractedText.trim().split(/\s+/).length;

      // Step 4: Chunking
      const rawChunks = this.chunkText(extractedText);
      const chunkEmbeddings: number[][] = [];
      for (const chunk of rawChunks) {
        chunkEmbeddings.push(await aiProvider.getEmbedding(chunk.content, 'document', title));
      }

      let authorId: string | undefined;
      if (opts.customMetadata?.authorName) {
        const author = await prisma.author.upsert({
          where: { name: opts.customMetadata.authorName },
          update: {},
          create: { name: opts.customMetadata.authorName },
        });
        authorId = author.id;
      }

      let publicationId: string | undefined;
      if (opts.customMetadata?.publicationName) {
        const pub = await prisma.publication.upsert({
          where: { name: opts.customMetadata.publicationName },
          update: {},
          create: { name: opts.customMetadata.publicationName },
        });
        publicationId = pub.id;
      }

      // Step 5: Save Document
      const document = await prisma.document.create({
        data: {
          title,
          slug: uniqueSlug,
          content: extractedText,
          extractedText,
          summary: analysis.summary,
          documentType: opts.customMetadata?.documentType || DocumentType.ARTICLE,
          accessLevel: opts.customMetadata?.accessLevel || AccessLevel.PUBLIC,
          status: DocumentStatus.INDEXED,
          publicationDate,
          originalFilename: opts.filename,
          contentHash,
          provenance: opts.customMetadata?.provenance || `Ingested via StoryVault Archive Center on ${new Date().toISOString()}`,
          wordCount,
          authorId,
          publicationId,
        },
      });

      // Step 6: Process chunks & embeddings
      for (let i = 0; i < rawChunks.length; i++) {
        const c = rawChunks[i];
        await prisma.documentChunk.create({
          data: {
            documentId: document.id,
            chunkIndex: i + 1,
            content: c.content,
            startChar: c.start,
            endChar: c.end,
            tokenCount: Math.ceil(c.content.length / 4),
            embedding: chunkEmbeddings[i],
          },
        });
      }

      // Step 7: Associate Topics if provided
      const topicNames = Array.from(new Set([...(opts.customMetadata?.topics || []), ...analysis.topics]));
      if (topicNames.length > 0) {
        for (const topicName of topicNames) {
          const tSlug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const topic = await prisma.topic.upsert({
            where: { slug: tSlug },
            update: {},
            create: { name: topicName, slug: tSlug },
          });
          await prisma.document.update({
            where: { id: document.id },
            data: { topics: { connect: { id: topic.id } } },
          });
        }
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
          where: { documentId_entityId: { documentId: document.id, entityId: entity.id } },
          update: { contextSnippet: extractedEntity.context },
          create: {
            documentId: document.id,
            entityId: entity.id,
            contextSnippet: extractedEntity.context,
          },
        });
      }

      // Complete IngestionJob
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: IngestionStatus.COMPLETED,
          totalChunks: rawChunks.length,
          completedAt: new Date(),
        },
      });

      logger.info(`Successfully ingested document "${title}" with ${rawChunks.length} chunks. (ID: ${document.id})`);

      return {
        jobId: job.id,
        documentId: document.id,
        title: document.title,
        slug: document.slug,
        chunksCount: rawChunks.length,
        contentHash,
      };
    } catch (err: any) {
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: IngestionStatus.FAILED,
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  /**
   * Retry a failed ingestion job
   */
  async retryJob(jobId: string) {
    const job = await prisma.ingestionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError('Ingestion job not found', 404);
    if (job.status !== IngestionStatus.FAILED) {
      throw new AppError('Only failed ingestion jobs can be retried.', 400);
    }

    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: IngestionStatus.PENDING,
        retryCount: job.retryCount + 1,
        errorMessage: null,
      },
    });

    return { message: `Job ${jobId} queued for retry.` };
  }
}

export const ingestionService = new IngestionService();
