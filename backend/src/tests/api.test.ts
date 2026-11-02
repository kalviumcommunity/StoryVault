import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { config } from '../config';
import { aiProvider } from '../services/aiProvider';
import { prisma } from '../lib/prisma';

describe('StoryVault API Test Suite', () => {
  let journalistToken = '';
  let archivistToken = '';
  let adminToken = '';
  let seededDocId = '';

  beforeAll(async () => {
    vi.spyOn(aiProvider, 'getEmbedding').mockImplementation(async (text) =>
      Array(config.GEMINI_EMBEDDING_DIMENSIONS).fill(
        text.toLowerCase().includes('phobos') ? 0 : 0.1
      )
    );
    vi.spyOn(aiProvider, 'analyzeDocument').mockResolvedValue({
      summary: 'A test summary grounded in the uploaded record.',
      topics: ['Test archive'],
      entities: [],
    });
    vi.spyOn(aiProvider, 'generateResearchAnswer').mockImplementation(async (_query, chunks) => ({
      answer: chunks.length
        ? 'The archive passage supports this finding [1].'
        : 'No relevant historical records were found in the archive.',
      confidenceScore: chunks.length ? 1 : 0,
      hasSufficientEvidence: chunks.length > 0,
      unsupportedClaims: chunks.length ? [] : ['No source passages were retrieved.'],
      providerMode: 'gemini',
    }));
    vi.spyOn(aiProvider, 'generateResearchBrief').mockResolvedValue({
      executiveSummary: 'The archive records an event [1].',
      historicalTimeline: [],
      keyEntities: [],
      previousEvents: [],
      supportingEvidence: [],
      conflictingAccounts: [],
      knowledgeGaps: [],
    });
    vi.spyOn(aiProvider, 'generateCompletion').mockResolvedValue({
      text: 'Gemini completion.',
      usage: { promptTokens: 10, completionTokens: 4, totalTokens: 14 },
    });

    // 1. Login as Journalist
    const jRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'journalist@storyvault.news', password: 'Password123!' });
    expect(jRes.status).toBe(200);
    journalistToken = jRes.body.token;

    // 2. Login as Archivist
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'archivist@storyvault.news', password: 'Password123!' });
    expect(aRes.status).toBe(200);
    archivistToken = aRes.body.token;

    // 3. Login as Admin
    const adRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@storyvault.news', password: 'Password123!' });
    expect(adRes.status).toBe(200);
    adminToken = adRes.body.token;
  });

  describe('1. Health and Discovery', () => {
    it('GET /api/health returns 200 with database connected', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toContain('connected');
    });

    it('GET /api/docs-json returns valid OpenAPI 3.0 specification', async () => {
      const res = await request(app).get('/api/docs-json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
    });
  });

  describe('2. Authentication & RBAC Permissions', () => {
    it('requires authentication for the centralized AI completion endpoint', async () => {
      const anonymous = await request(app)
        .post('/api/ai/completion')
        .send({ messages: [{ role: 'user', content: 'Say hello.' }] });
      expect(anonymous.status).toBe(401);

      const authenticated = await request(app)
        .post('/api/ai/completion')
        .set('Authorization', 'Bearer ' + journalistToken)
        .send({ messages: [{ role: 'user', content: 'Say hello.' }] });
      expect(authenticated.status).toBe(200);
      expect(authenticated.body.text).toBe('Gemini completion.');
      expect(authenticated.body.usage.totalTokens).toBe(14);
    });

    it('serves public archive pages without credentials while protecting private endpoints', async () => {
      const documentsRes = await request(app).get('/api/documents');
      expect(documentsRes.status).toBe(200);
      expect(documentsRes.body.documents.length).toBeGreaterThan(0);
      expect(documentsRes.body.documents.every((doc: any) => doc.accessLevel === 'PUBLIC')).toBe(true);
      const documentDetailRes = await request(app).get(
        `/api/documents/${documentsRes.body.documents[0].id}`
      );
      expect(documentDetailRes.status).toBe(200);
      expect(documentDetailRes.body.document.accessLevel).toBe('PUBLIC');

      const searchRes = await request(app)
        .post('/api/search')
        .send({ query: 'Petrochemical', mode: 'keyword' });
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.results.length).toBeGreaterThan(0);
      expect(searchRes.body.results.every((doc: any) => doc.accessLevel === 'PUBLIC')).toBe(true);

      const briefRes = await request(app).get('/api/briefs');
      expect(briefRes.status).toBe(200);
      expect(briefRes.body.briefs.every((brief: any) => brief.status === 'PUBLISHED')).toBe(true);
      if (briefRes.body.briefs.length > 0) {
        const detailRes = await request(app).get(`/api/briefs/${briefRes.body.briefs[0].id}`);
        expect(detailRes.status).toBe(200);
        expect(detailRes.body.brief.status).toBe('PUBLISHED');
      }

      const collectionsRes = await request(app).get('/api/collections');
      expect(collectionsRes.status).toBe(200);
      expect(collectionsRes.body.collections.every((collection: any) => collection.isPublic)).toBe(true);

      const privateSavedSearchesRes = await request(app).get('/api/collections/saved-searches');
      expect(privateSavedSearchesRes.status).toBe(401);

      const savedSearchesRes = await request(app)
        .get('/api/collections/saved-searches')
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(savedSearchesRes.status).toBe(200);

      const timelineRes = await request(app).get('/api/timeline/entities');
      expect(timelineRes.status).toBe(200);

      const assistantRes = await request(app)
        .post('/api/research/ask')
        .send({ query: 'What was uncovered regarding Apex Petrochemical well microfractures?' });
      expect(assistantRes.status).toBe(200);

      const metricsRes = await request(app).get('/api/admin/metrics');
      expect(metricsRes.status).toBe(401);
      const authenticatedMetricsRes = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(authenticatedMetricsRes.status).toBe(200);

      const usersRes = await request(app).get('/api/users');
      expect(usersRes.status).toBe(401);
    });

    it('GET /api/auth/me returns current authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('journalist@storyvault.news');
      expect(res.body.user.role).toBe('JOURNALIST');
    });

    it('Journalist cannot access Admin-only user management (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('Admin can access user management (200 OK)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('3. Documents & Restricted Clearance', () => {
    it('GET /api/documents returns indexed documents', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBeGreaterThan(0);
      seededDocId = res.body.documents[0].id;
    });

    it('GET /api/documents/:id returns full content, metadata, and chunks', async () => {
      const res = await request(app)
        .get(`/api/documents/${seededDocId}`)
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(200);
      expect(res.body.document.id).toBe(seededDocId);
      expect(Array.isArray(res.body.document.chunks)).toBe(true);
      expect(res.body.document.chunks.length).toBeGreaterThan(0);
    });

    it('Restricted classification prevents unauthorized inspection (403)', async () => {
      // Find a CLASSIFIED document
      const allDocsRes = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`);
      const classifiedDoc = allDocsRes.body.documents.find((d: any) => d.accessLevel === 'CLASSIFIED');

      if (classifiedDoc) {
        // Journalist attempting to view CLASSIFIED document
        const restrictedRes = await request(app)
          .get(`/api/documents/${classifiedDoc.id}`)
          .set('Authorization', `Bearer ${journalistToken}`);
        expect(restrictedRes.status).toBe(403);
        expect(restrictedRes.body.error).toContain('Access restricted');

        // Admin attempting to view CLASSIFIED document succeeds
        const adminRes = await request(app)
          .get(`/api/documents/${classifiedDoc.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(adminRes.status).toBe(200);
      }
    });
  });

  describe('4. Universal Search Pipeline', () => {
    it('Keyword search finds specific historical terms', async () => {
      const res = await request(app)
        .post('/api/search')
        .send({ query: 'Petrochemical', mode: 'keyword' })
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0].title).toContain('Petrochemical');
    });

    it('Semantic search retrieves conceptually related passages', async () => {
      const uniqueId = Date.now();
      const content = 'A toxic chemical leak affected a nearby water supply.';
      const doc = await prisma.document.create({
        data: {
          title: 'Semantic Search Test Record',
          slug: `semantic-search-test-${uniqueId}`,
          content,
          contentHash: `semantic-search-test-${uniqueId}`,
          publicationDate: new Date('2024-01-01'),
          chunks: {
            create: {
              chunkIndex: 0,
              content,
              startChar: 0,
              endChar: content.length,
              embedding: Array(config.GEMINI_EMBEDDING_DIMENSIONS).fill(0.1),
            },
          },
        },
      });

      try {
        const res = await request(app)
          .post('/api/search')
          .send({ query: 'toxic chemical leak water supply', mode: 'semantic' })
          .set('Authorization', `Bearer ${journalistToken}`);
        expect(res.status).toBe(200);
        expect(res.body.results.some((result: { id: string }) => result.id === doc.id)).toBe(true);
      } finally {
        await prisma.document.delete({ where: { id: doc.id } });
      }
    });

    it('Hybrid search returns RRF-ranked results with snippets', async () => {
      const res = await request(app)
        .post('/api/search')
        .send({ query: 'Silvergate surveillance', mode: 'hybrid' })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0].score).toBeGreaterThan(0);
    });

    it('GET /api/search/suggestions returns typeahead suggestions', async () => {
      const res = await request(app).get('/api/search/suggestions?q=Apex');
      expect(res.status).toBe(200);
      expect(res.body.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('5. Grounded AI Research Assistant & Citations', () => {
    it('retrieves archive evidence for a conversational query when semantic vectors do not match', async () => {
      vi.mocked(aiProvider.getEmbedding).mockResolvedValue(Array(256).fill(0));

      const res = await request(app)
        .post('/api/research/ask')
        .send({ query: 'Could you tell me what Dr Aris Vance reported?' });

      expect(res.status).toBe(200);
      expect(res.body.hasSufficientEvidence).toBe(true);
      expect(res.body.citations.length).toBeGreaterThan(0);
      expect(res.body.retrievedSources.some((source: any) => source.title.includes('Apex Petrochemical'))).toBe(true);
    });

    it('POST /api/research/ask generates evidence-backed answer with verified citations', async () => {
      const res = await request(app)
        .post('/api/research/ask')
        .send({ query: 'What was uncovered regarding Apex Petrochemical well microfractures?' })
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(200);
      expect(res.body.answer).toBeDefined();
      expect(res.body.hasSufficientEvidence).toBe(true);
      expect(res.body.citations.length).toBeGreaterThan(0);
      // Ensure citations have complete transparent metadata
      const firstCite = res.body.citations[0];
      expect(firstCite.documentId).toBeDefined();
      expect(firstCite.documentTitle).toBeDefined();
      expect(firstCite.excerptText).toBeDefined();
    });

    it('Queries with no archive evidence return honest limitation notice without hallucinations', async () => {
      const res = await request(app)
        .post('/api/research/ask')
        .send({ query: 'What happened on the Martian moon Phobos in 1923?' })
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(200);
      expect(res.body.hasSufficientEvidence).toBe(false);
      expect(res.body.answer).toContain('No relevant historical records were found');
    });
  });

  describe('6. Ingestion & Duplicate Prevention', () => {
    it('Rejects duplicate file upload with 409 Conflict', async () => {
      // Ingest sample text
      const sampleText = 'Unique investigative whistleblower memo dated ' + Date.now();
      let documentId: string | undefined;

      try {
        const res1 = await request(app)
          .post('/api/ingestion/upload')
          .set('Authorization', `Bearer ${archivistToken}`)
          .attach('file', Buffer.from(sampleText, 'utf-8'), 'first_memo.txt')
          .field('title', 'Whistleblower Submission 101');
        expect(res1.status).toBe(201);
        documentId = res1.body.data.documentId;

        // Attempt duplicate upload with identical bytes
        const res2 = await request(app)
          .post('/api/ingestion/upload')
          .set('Authorization', `Bearer ${archivistToken}`)
          .attach('file', Buffer.from(sampleText, 'utf-8'), 'duplicate_memo.txt')
          .field('title', 'Duplicate Submission Attempt');
        expect(res2.status).toBe(409);
        expect(res2.body.error).toContain('Duplicate document rejected');
      } finally {
        if (documentId) {
          await prisma.document.delete({ where: { id: documentId } });
        }
      }
    });
  });

  describe('7. Brief Generation & Collections', () => {
    it('POST /api/briefs/generate creates structured 8-section research brief', async () => {
      const res = await request(app)
        .post('/api/briefs/generate')
        .send({ topic: 'Apex Petrochemical' })
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(res.status).toBe(200);
      const brief = res.body.brief;
      expect(brief.executiveSummary).toBeDefined();
      expect(Array.isArray(brief.historicalTimeline)).toBe(true);
      expect(Array.isArray(brief.keyEntities)).toBe(true);
      expect(Array.isArray(brief.previousEvents)).toBe(true);
      expect(Array.isArray(brief.supportingEvidence)).toBe(true);
      expect(Array.isArray(brief.conflictingAccounts)).toBe(true);
      expect(Array.isArray(brief.knowledgeGaps)).toBe(true);
      expect(Array.isArray(brief.sourceList)).toBe(true);
      expect(Array.isArray(brief.citations)).toBe(true);
    });

    it('Journalist can create and query collections', async () => {
      const createRes = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${journalistToken}`)
        .send({ name: 'Special Investigative Taskforce', description: 'Curated evidence for developing story' });
      expect(createRes.status).toBe(201);
      const collectionId = createRes.body.collection.id;

      // Add document to collection
      const addRes = await request(app)
        .post(`/api/collections/${collectionId}/documents`)
        .set('Authorization', `Bearer ${journalistToken}`)
        .send({ documentId: seededDocId, notes: 'Foundational trial evidence' });
      expect(addRes.status).toBe(201);

      // Inspect collection
      const getRes = await request(app)
        .get(`/api/collections/${collectionId}`)
        .set('Authorization', `Bearer ${journalistToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.collection.items.length).toBe(1);
    });
  });
});
