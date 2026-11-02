import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AccessLevel, DocumentType, Role } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { ingestionService } from '../services/ingestionService';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// Configure Multer for in-memory upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/pdf',
      'application/octet-stream',
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(txt|md|csv|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new AppError('Unsupported file type. Please upload a .txt, .md, .csv, or .pdf document.', 400));
    }
  },
});

// POST /api/ingestion/upload - Upload and process document
router.post(
  '/upload',
  authenticate,
  requireRole(Role.ARCHIVIST, Role.ADMIN),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No file was uploaded.', 400);
      }

      const {
        title,
        authorName,
        publicationName,
        publicationDate,
        documentType,
        accessLevel,
        topics,
        provenance,
      } = req.body;

      const parsedTopics = topics ? (typeof topics === 'string' ? JSON.parse(topics) : topics) : [];

      const result = await ingestionService.ingestFile({
        filename: req.file.originalname,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        size: req.file.size,
        userId: req.user!.id,
        customMetadata: {
          title,
          authorName,
          publicationName,
          publicationDate,
          documentType: documentType as DocumentType,
          accessLevel: accessLevel as AccessLevel,
          topics: parsedTopics,
          provenance,
        },
      });

      await recordAuditLog({
        userId: req.user!.id,
        action: 'INGEST_FILE',
        entityType: 'Document',
        entityId: result.documentId,
        details: { filename: req.file.originalname, contentHash: result.contentHash },
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'File uploaded, parsed, chunked, and indexed successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ingestion/sample-csv - Ingest a pre-packaged sample CSV of newsroom archive records
router.post(
  '/sample-csv',
  authenticate,
  requireRole(Role.ARCHIVIST, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sampleCsv = `title,author,publication,date,type,content
"Federal Trade Commission Preliminary Inquiry Into Megacorp Cartel","Elena Vance","The National Ledger","1997-04-12","ARTICLE","Declassified agency memos obtained through public interest requests show the Federal Trade Commission launched a formal preliminary antitrust inquiry into market allocation agreements among telecommunication consortiums."
"Interview Transcript: Dr. Aris Vance on Sub-Surface Well Failures","Marcus Thorne","Investigative Journal","2004-09-18","INTERVIEW_TRANSCRIPT","THORNE: When did geological surveys first identify structural leaching? VANCE: In late March 2003, three months before the state water board granted extension waivers."
"Field Dispatch: Project Helios Orbital Relay Launch Cancellation","Sarah Jenkins","Chronicle Science Desk","2011-02-14","FOOTAGE_NOTE","Archival Betacam SP footage log: Reel 4, timecode 01:14:22. Launch telemetry displays an abnormal pressure gradient across the secondary oxidizer valve prior to ignition abort."
`;

      const result = await ingestionService.ingestFile({
        filename: 'sample_newsroom_archives.csv',
        buffer: Buffer.from(sampleCsv, 'utf-8'),
        mimeType: 'text/csv',
        size: Buffer.byteLength(sampleCsv),
        userId: req.user!.id,
        customMetadata: {
          title: 'Preserved Newsroom Archive Batch - 1997-2011 Sample Records',
          provenance: 'Imported from StoryVault Sample Archive CSV Ingestion Suite',
        },
      });

      res.status(201).json({
        message: 'Sample archival CSV ingested successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/ingestion/jobs - List ingestion jobs
router.get(
  '/jobs',
  authenticate,
  requireRole(Role.ARCHIVIST, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = await prisma.ingestionJob.findMany({
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ jobs });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ingestion/jobs/:id/retry - Retry failed job
router.post(
  '/jobs/:id/retry',
  authenticate,
  requireRole(Role.ARCHIVIST, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await ingestionService.retryJob(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
