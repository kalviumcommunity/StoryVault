import type { ChatHistoryMessage, ResearchAnswer } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status = 400, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('storyvault_token');
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if FormData is used (browser sets boundary automatically)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || `Request failed with status ${response.status}`,
      response.status,
      data.details
    );
  }

  return data as T;
}

export const api = {
  getMe: () => request<{ user: any }>('/auth/me'),

  // Documents
  getDocuments: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ documents: any[]; total: number; page: number; totalPages: number }>(
      `/documents${qs ? `?${qs}` : ''}`
    );
  },
  getDocument: (id: string, highlight?: string) =>
    request<{ document: any; relatedDocuments: any[] }>(
      `/documents/${id}${highlight ? `?highlight=${encodeURIComponent(highlight)}` : ''}`
    ),
  createDocument: (data: any) =>
    request<{ message: string; document: any }>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDocument: (id: string) =>
    request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),

  // Search
  search: (filters: any) =>
    request<{
      results: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      searchModeUsed: string;
      semanticIndexAvailable: boolean;
    }>('/search', {
      method: 'POST',
      body: JSON.stringify(filters),
    }),
  getSuggestions: (q: string) =>
    request<{ suggestions: Array<{ text: string; type: string; id: string }> }>(
      `/search/suggestions?q=${encodeURIComponent(q)}`
    ),

  // Research Assistant
  askAssistant: (query: string, history: ChatHistoryMessage[] = []) =>
    request<ResearchAnswer>('/research/ask', {
      method: 'POST',
      body: JSON.stringify({ query, history }),
    }),

  // Research Briefs
  getBriefs: () => request<{ briefs: any[] }>('/briefs'),
  getBrief: (id: string) => request<{ brief: any }>(`/briefs/${id}`),
  generateBrief: (topic: string) =>
    request<{ brief: any }>('/briefs/generate', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    }),
  saveBrief: (briefData: any) =>
    request<{ message: string; brief: any }>('/briefs', {
      method: 'POST',
      body: JSON.stringify(briefData),
    }),
  updateBrief: (id: string, briefData: any) =>
    request<{ message: string; brief: any }>(`/briefs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(briefData),
    }),
  deleteBrief: (id: string) =>
    request<{ message: string }>(`/briefs/${id}`, { method: 'DELETE' }),
  exportBrief: (id: string) =>
    request<{ markdown: string; brief: any }>(`/briefs/${id}/export`),

  // Collections
  getCollections: () => request<{ collections: any[] }>('/collections'),
  getCollection: (id: string) => request<{ collection: any }>(`/collections/${id}`),
  createCollection: (data: { name: string; description?: string; isPublic?: boolean }) =>
    request<{ message: string; collection: any }>('/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addDocumentToCollection: (collectionId: string, documentId: string, notes?: string) =>
    request<{ message: string }>(`/collections/${collectionId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ documentId, notes }),
    }),
  removeDocumentFromCollection: (collectionId: string, documentId: string) =>
    request<{ message: string }>(`/collections/${collectionId}/documents/${documentId}`, {
      method: 'DELETE',
    }),
  deleteCollection: (id: string) =>
    request<{ message: string }>(`/collections/${id}`, { method: 'DELETE' }),
  getSavedSearches: () => request<{ savedSearches: any[] }>('/collections/saved-searches'),
  saveSearch: (name: string, query: string, filters?: any) =>
    request<{ message: string; savedSearch: any }>('/collections/saved-searches', {
      method: 'POST',
      body: JSON.stringify({ name, query, filters }),
    }),

  // Timeline & Entities
  getTimeline: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ events: any[] }>(`/timeline${qs ? `?${qs}` : ''}`);
  },
  getEntityGraph: () => request<{ nodes: any[]; links: any[] }>('/timeline/entities'),

  // Ingestion
  uploadFile: (formData: FormData) =>
    request<{ message: string; data: any }>('/ingestion/upload', {
      method: 'POST',
      body: formData,
    }),
  importSampleCsv: () =>
    request<{ message: string; data: any }>('/ingestion/sample-csv', {
      method: 'POST',
    }),
  getIngestionJobs: () => request<{ jobs: any[] }>('/ingestion/jobs'),
  retryIngestionJob: (jobId: string) =>
    request<{ message: string }>(`/ingestion/jobs/${jobId}/retry`, {
      method: 'POST',
    }),

  // Admin & Metrics
  getMetrics: () => request<any>('/admin/metrics'),
  getAuditLogs: (page = 1, limit = 20) =>
    request<any>(`/admin/audit-logs?page=${page}&limit=${limit}`),
  getSystemHealth: () => request<any>('/admin/system-health'),
  getUsers: () => request<{ users: any[] }>('/users'),
  updateUserRole: (id: string, role: string) =>
    request<{ message: string; user: any }>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
};
