export type Role = 'JOURNALIST' | 'EDITOR' | 'ARCHIVIST' | 'ADMIN';

export type DocumentType =
  | 'ARTICLE'
  | 'INTERVIEW_TRANSCRIPT'
  | 'FOOTAGE_NOTE'
  | 'LEAK_MEMO'
  | 'HISTORICAL_REPORT';

export type AccessLevel = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED' | 'CLASSIFIED';

export type DocumentStatus = 'DRAFT' | 'INDEXED' | 'ARCHIVED';

export type EntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'EVENT'
  | 'TECHNOLOGY'
  | 'CONCEPT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface Author {
  id: string;
  name: string;
  title?: string | null;
  organization?: string | null;
  bio?: string | null;
}

export interface Publication {
  id: string;
  name: string;
  type?: string | null;
  country?: string | null;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
}

export interface Entity {
  id: string;
  name: string;
  entityType: EntityType;
  description?: string | null;
  mentionsCount?: number;
}

export interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  startChar?: number;
  endChar?: number;
  tokenCount: number;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string | null;
  documentType: DocumentType;
  accessLevel: AccessLevel;
  publicationDate: string;
  originalSourceUrl?: string | null;
  originalFilename?: string | null;
  provenance?: string | null;
  wordCount: number;
  author?: Author | null;
  publication?: Publication | null;
  topics?: Topic[];
  entities?: Array<{
    relevanceScore: number;
    entity: Entity;
  }>;
  chunks?: DocumentChunk[];
  highlightedContent?: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  documentType: DocumentType;
  accessLevel: AccessLevel;
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

export interface ResearchAnswer {
  answer: string;
  citations: VerifiedCitation[];
  confidenceScore: number;
  hasSufficientEvidence: boolean;
  unsupportedClaims: string[];
  providerMode: 'gemini';
  retrievedSources: Array<{
    index: number;
    id: string;
    title: string;
    author: string;
    publication: string;
    date: string;
    documentType: string;
    snippet: string;
    score: number;
  }>;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ResearchBrief {
  id: string;
  title: string;
  topic?: string | null;
  executiveSummary: string;
  historicalTimeline: Array<{
    date: string;
    event: string;
    sourceId: string;
    sourceTitle: string;
  }>;
  keyEntities: Array<{
    name: string;
    role?: string;
    entityType?: string;
    count: number;
  }>;
  previousEvents: Array<{
    event: string;
    date?: string;
    context: string;
    significance: string;
  }>;
  supportingEvidence: Array<{
    claim: string;
    citationIndex: number;
    sourceId?: string;
    sourceTitle?: string;
    confidence: number;
  }>;
  conflictingAccounts: Array<{
    topic: string;
    accountA: string;
    accountB: string;
    sourceDetails: string;
  }>;
  knowledgeGaps: Array<{
    question: string;
    reasonForUncertainty: string;
  }>;
  sourceList: Array<{
    index: number;
    documentId: string;
    title: string;
    author: string;
    publication: string;
    date: string;
    url?: string;
  }>;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; role: Role };
  citations?: Array<{
    id: string;
    citationIndex: number;
    statementText: string;
    excerptText: string;
    confidenceScore: number;
    document: {
      id: string;
      title: string;
      publicationDate: string;
      author?: { name: string } | null;
      publication?: { name: string } | null;
    };
  }>;
}

export interface Collection {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  ownerId: string;
  owner?: { id: string; name: string };
  items?: Array<{
    id: string;
    documentId: string;
    notes?: string | null;
    addedAt: string;
    document: ArchiveDocument;
  }>;
  _count?: { items: number };
}

export interface IngestionJob {
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  contentHash: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalChunks: number;
  errorMessage?: string | null;
  retryCount: number;
  createdAt: string;
  completedAt?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: Role } | null;
}
