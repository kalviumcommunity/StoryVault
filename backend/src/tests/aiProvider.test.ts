import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockModels, mockGoogleGenAI } = vi.hoisted(() => {
  const mockModels = {
    embedContent: vi.fn(),
    generateContent: vi.fn(),
  };
  const mockGoogleGenAI = vi.fn().mockImplementation(() => ({ models: mockModels }));
  return { mockModels, mockGoogleGenAI };
});

vi.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAI,
}));

import { config } from '../config';
import { aiProvider } from '../services/aiProvider';

describe('GeminiAIService', () => {
  beforeEach(() => {
    mockModels.embedContent.mockReset();
    mockModels.generateContent.mockReset();
  });

  it('disables SDK retries so the bounded service policy is authoritative', () => {
    expect(mockGoogleGenAI).toHaveBeenCalledWith({
      apiKey: config.GEMINI_API_KEY,
      httpOptions: {
        timeout: 30_000,
        retryOptions: { attempts: 1 },
      },
    });
  });

  it('creates query and document embeddings with Gemini configuration', async () => {
    mockModels.embedContent.mockResolvedValue({ embeddings: [{ values: [0.25, -0.5] }] });

    await expect(aiProvider.getEmbedding('archive query')).resolves.toEqual([0.25, -0.5]);
    expect(mockModels.embedContent).toHaveBeenCalledWith({
      model: config.GEMINI_EMBEDDING_MODEL,
      contents: 'task: search result | query: archive query',
      config: { outputDimensionality: config.GEMINI_EMBEDDING_DIMENSIONS },
    });

    await aiProvider.getEmbedding('archive document', 'document', 'Archive title');
    expect(mockModels.embedContent).toHaveBeenLastCalledWith({
      model: config.GEMINI_EMBEDDING_MODEL,
      contents: 'title: Archive title | text: archive document',
      config: { outputDimensionality: config.GEMINI_EMBEDDING_DIMENSIONS },
    });
  });

  it('grounds assistant answers in retrieved records and preserves citations', async () => {
    mockModels.generateContent.mockResolvedValue({ text: 'The record confirms the event [1].' });
    const sources = [
      {
        chunkId: 'chunk-1',
        documentId: 'doc-1',
        documentTitle: 'Archive Record',
        authorName: 'A. Reporter',
        publicationName: 'Daily Archive',
        publicationDate: '2001-04-05',
        content: 'The record confirms the event.',
        score: 0.9,
      },
    ];

    const result = await aiProvider.generateResearchAnswer('What happened?', sources, [
      { role: 'user', content: 'Follow-up question' },
      { role: 'assistant', content: 'Prior response' },
    ]);

    expect(result.answer).toContain('[1]');
    expect(result.hasSufficientEvidence).toBe(true);
    expect(result.providerMode).toBe('gemini');
    expect(mockModels.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: config.GEMINI_MODEL,
        config: expect.objectContaining({ temperature: 0.1 }),
      })
    );
    expect(mockModels.generateContent.mock.calls[0][0].contents).toHaveLength(3);
  });

  it('returns an archive limitation without calling Gemini when no records are retrieved', async () => {
    const result = await aiProvider.generateResearchAnswer('Unanswerable question', []);

    expect(result.hasSufficientEvidence).toBe(false);
    expect(result.answer).toContain('No relevant historical records were found');
    expect(mockModels.generateContent).not.toHaveBeenCalled();
  });

  it('routes generic completion messages through the configured Gemini model', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: 'A Gemini response.',
      usageMetadata: {
        promptTokenCount: 12,
        candidatesTokenCount: 6,
        totalTokenCount: 18,
      },
    });

    await expect(
      aiProvider.generateCompletion([
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'Hello.' },
        { role: 'assistant', content: 'Hi.' },
      ])
    ).resolves.toEqual({
      text: 'A Gemini response.',
      usage: { promptTokens: 12, completionTokens: 6, totalTokens: 18 },
    });
    expect(mockModels.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: config.GEMINI_MODEL,
        contents: [
          { role: 'user', parts: [{ text: 'Hello.' }] },
          { role: 'model', parts: [{ text: 'Hi.' }] },
        ],
        config: expect.objectContaining({
          systemInstruction: 'Be concise.',
          maxOutputTokens: 2048,
        }),
      })
    );
  });

  it('extracts document summary, topics, and entities from Gemini JSON', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: JSON.stringify({
        summary: 'The article reports an archival event.',
        topics: ['Archive history'],
        entities: [
          { name: 'A. Reporter', entityType: 'PERSON', context: 'The article identifies A. Reporter.' },
        ],
      }),
    });

    await expect(aiProvider.analyzeDocument('Archive title', 'Archive content')).resolves.toEqual({
      summary: 'The article reports an archival event.',
      topics: ['Archive history'],
      entities: [
        { name: 'A. Reporter', entityType: 'PERSON', context: 'The article identifies A. Reporter.' },
      ],
    });
  });

  it('generates cited research brief sections from source-indexed Gemini JSON', async () => {
    mockModels.generateContent.mockResolvedValue({
      text: JSON.stringify({
        executiveSummary: 'The archive documents the event [1].',
        historicalTimeline: [],
        keyEntities: [],
        previousEvents: [],
        supportingEvidence: [],
        conflictingAccounts: [],
        knowledgeGaps: [],
      }),
    });

    const brief = await aiProvider.generateResearchBrief('Archive event', [
      {
        id: 'doc-1',
        title: 'Archive Record',
        publicationDate: '2001-04-05',
        authorName: null,
        publicationName: null,
        snippet: 'A short excerpt.',
        passage: 'The archive documents the event.',
        entities: [],
      },
    ]);

    expect(brief.executiveSummary).toContain('[1]');
  });

  it('reports Gemini authentication failures without leaking provider details', async () => {
    const secret = 'AIzaSyDUMMY_TEST_ONLY_123456789012345';
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockModels.embedContent.mockRejectedValue(
      Object.assign(new Error(`request failed?key=${secret}`), { code: 401 })
    );

    await expect(aiProvider.getEmbedding('private text')).rejects.toMatchObject({
      statusCode: 502,
      message: 'Gemini authentication failed. Verify the backend GEMINI_API_KEY configuration.',
    });
    const loggedError = errorLog.mock.calls.flat().join(' ');
    expect(loggedError).toContain('[REDACTED]');
    expect(loggedError).not.toContain(secret);
    errorLog.mockRestore();
  });

  it('recognizes invalid Gemini API keys returned as HTTP 400', async () => {
    mockModels.embedContent.mockRejectedValue(
      Object.assign(new Error('{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}'), { code: 400 })
    );

    await expect(aiProvider.getEmbedding('private text')).rejects.toMatchObject({
      statusCode: 502,
      message: 'Gemini authentication failed. Verify the backend GEMINI_API_KEY configuration.',
    });
  });

  it('reports Gemini rate limits without falling back to another provider', async () => {
    mockModels.embedContent.mockRejectedValue(Object.assign(new Error('quota detail'), { code: 429 }));

    await expect(aiProvider.getEmbedding('private text')).rejects.toMatchObject({
      statusCode: 503,
      message: 'Gemini rate limit reached. Retry the request later.',
    });
  });

  it('retries transient Gemini failures with bounded exponential jitter', async () => {
    vi.useFakeTimers();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    mockModels.embedContent
      .mockRejectedValueOnce(Object.assign(new Error('temporary outage'), { code: 503 }))
      .mockRejectedValueOnce(Object.assign(new Error('temporary outage'), { code: 503 }))
      .mockResolvedValue({ embeddings: [{ values: [0.25, -0.5] }] });

    try {
      const request = aiProvider.getEmbedding('retry this query');
      await vi.runAllTimersAsync();

      await expect(request).resolves.toEqual([0.25, -0.5]);
      expect(mockModels.embedContent).toHaveBeenCalledTimes(3);
      expect(timeout.mock.calls.map((call) => call[1])).toEqual([250, 500]);
    } finally {
      timeout.mockRestore();
      random.mockRestore();
      vi.useRealTimers();
    }
  });

  it('retries network timeouts within the same bounded policy', async () => {
    vi.useFakeTimers();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mockModels.embedContent
      .mockRejectedValueOnce(Object.assign(new Error('request timed out'), { name: 'TimeoutError' }))
      .mockResolvedValue({ embeddings: [{ values: [0.25, -0.5] }] });

    try {
      const request = aiProvider.getEmbedding('retry after a network timeout');
      await vi.runAllTimersAsync();
      await expect(request).resolves.toEqual([0.25, -0.5]);
      expect(mockModels.embedContent).toHaveBeenCalledTimes(2);
    } finally {
      random.mockRestore();
      vi.useRealTimers();
    }
  });

  it('honors Gemini Retry-After for retryable responses', async () => {
    vi.useFakeTimers();
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    mockModels.embedContent
      .mockRejectedValueOnce(
        Object.assign(new Error('rate limited'), {
          code: 429,
          response: { headers: new Headers({ 'retry-after': '1' }) },
        })
      )
      .mockResolvedValue({ embeddings: [{ values: [0.25, -0.5] }] });

    try {
      const request = aiProvider.getEmbedding('retry after the server window');
      await vi.runAllTimersAsync();

      await expect(request).resolves.toEqual([0.25, -0.5]);
      expect(mockModels.embedContent).toHaveBeenCalledTimes(2);
      expect(timeout.mock.calls.map((call) => call[1])).toEqual([1000]);
    } finally {
      timeout.mockRestore();
      vi.useRealTimers();
    }
  });

  it('does not retry exhausted quotas or permanent model errors', async () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    mockModels.embedContent.mockRejectedValueOnce(
      Object.assign(new Error('You exceeded your current quota.'), { code: 429 })
    );

    await expect(aiProvider.getEmbedding('quota check')).rejects.toMatchObject({
      statusCode: 503,
      message: 'Gemini API quota is exhausted. Check the project quota and billing configuration.',
    });

    mockModels.embedContent.mockRejectedValueOnce(
      Object.assign(new Error('model not found'), { code: 404 })
    );
    await expect(aiProvider.getEmbedding('model check')).rejects.toMatchObject({
      statusCode: 502,
      message: 'Gemini is temporarily unavailable. Retry the request later.',
    });
    expect(mockModels.embedContent).toHaveBeenCalledTimes(2);
    expect(timeout).not.toHaveBeenCalled();
    timeout.mockRestore();
  });

  it('preserves Gemini service-unavailable status for retryable upstream failures', async () => {
    mockModels.embedContent.mockRejectedValue(
      Object.assign(new Error('model temporarily overloaded'), { code: 503 })
    );

    await expect(aiProvider.getEmbedding('private text')).rejects.toMatchObject({
      statusCode: 503,
      message: 'Gemini is temporarily unavailable. Retry the request later.',
    });
  });
});
