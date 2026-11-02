import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  Plus,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { IngestionJob } from '../types';
import { useAuth } from '../context/AuthContext';

export const IngestionPage: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [publicationName, setPublicationName] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [documentType, setDocumentType] = useState('ARTICLE');
  const [accessLevel, setAccessLevel] = useState('PUBLIC');
  const [topics, setTopics] = useState('');
  const [provenance, setProvenance] = useState('');

  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await api.getIngestionJobs();
      setJobs(res.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (!title) {
        setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file to ingest.');
      return;
    }

    setUploading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (authorName) formData.append('authorName', authorName);
    if (publicationName) formData.append('publicationName', publicationName);
    if (publicationDate) formData.append('publicationDate', publicationDate);
    formData.append('documentType', documentType);
    formData.append('accessLevel', accessLevel);
    if (provenance) formData.append('provenance', provenance);
    if (topics) {
      const topicsArr = topics.split(',').map((t) => t.trim()).filter(Boolean);
      formData.append('topics', JSON.stringify(topicsArr));
    }

    try {
      const res = await api.uploadFile(formData);
      setStatusMsg({
        type: 'success',
        text: `Document "${res.data.title}" successfully ingested and indexed with ${res.data.chunksCount} chunks!`,
      });
      setFile(null);
      setTitle('');
      setAuthorName('');
      setProvenance('');
      fetchJobs();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Ingestion failed. Duplicate content or invalid format.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSampleImport = async () => {
    setUploading(true);
    setStatusMsg(null);
    try {
      const res = await api.importSampleCsv();
      setStatusMsg({
        type: 'success',
        text: `Batch sample archives CSV successfully parsed and ingested into StoryVault!`,
      });
      fetchJobs();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Sample CSV batch import failed.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await api.retryIngestionJob(jobId);
      fetchJobs();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const isAuthorized = user?.role === 'ARCHIVIST' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Archive Ingestion & Indexing Center
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Upload documents (.txt, .md, .csv, .pdf), validate SHA-256 deduplication, and generate vector embeddings.
            </p>
          </div>

          <button
            onClick={handleSampleImport}
            disabled={uploading || !isAuthorized}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Database className="w-4 h-4 text-brand-400" />
            Import Sample CSV Batch
          </button>
        </div>

        {/* Authorization Notice if user is not Archivist/Admin */}
        {!isAuthorized && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-xs text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Role Clearance Notice:</span> You are currently viewing as{' '}
              <strong className="underline">{user?.role}</strong>. Document ingestion requires{' '}
              <strong>ARCHIVIST</strong> or <strong>ADMIN</strong> role. Use the role switcher in the header to evaluate ingestion.
            </div>
          </div>
        )}

        {/* Upload Form & Metadata Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Upload Form (2 cols) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <span className="font-mono text-xs uppercase font-bold text-slate-700 block pb-3 border-b border-slate-200">
              New Archival Ingestion Intake
            </span>

            {statusMsg && (
              <div
                className={`p-4 rounded-lg text-xs flex items-start gap-2.5 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Select Document File (.txt, .md, .csv, .pdf)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-brand-500 bg-slate-50 transition cursor-pointer">
                  <input
                    type="file"
                    id="fileInput"
                    accept=".txt,.md,.csv,.pdf,text/plain,text/markdown,text/csv,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="fileInput" className="cursor-pointer space-y-2 block">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                    <span className="block text-slate-700 font-medium">
                      {file ? file.name : 'Click to select or drag and drop archive file'}
                    </span>
                    <span className="block text-[11px] text-slate-400 font-mono">
                      Max file size: 10MB • SHA-256 deduplication applied
                    </span>
                  </label>
                </div>
              </div>

              {/* Title & Document Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chemical Leak Shift Logs Oct 1982"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ARTICLE">Investigative Article</option>
                    <option value="INTERVIEW_TRANSCRIPT">Interview Transcript</option>
                    <option value="LEAK_MEMO">Leak Memo</option>
                    <option value="FOOTAGE_NOTE">Archival Footage Note</option>
                    <option value="HISTORICAL_REPORT">Historical Lore Report</option>
                  </select>
                </div>
              </div>

              {/* Author, Publication, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Author / Reporter</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Marcus Thorne"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Publication</label>
                  <input
                    type="text"
                    value={publicationName}
                    onChange={(e) => setPublicationName(e.target.value)}
                    placeholder="Metropolitan Journal"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Archived Date</label>
                  <input
                    type="date"
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Access Clearance & Topics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Security Classification</label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PUBLIC">PUBLIC (All Journalists)</option>
                    <option value="INTERNAL">INTERNAL (Verified Staff)</option>
                    <option value="RESTRICTED">RESTRICTED (Senior Editors)</option>
                    <option value="CLASSIFIED">CLASSIFIED (Admin Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Topics (comma separated)
                  </label>
                  <input
                    type="text"
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    placeholder="Environmental, Groundwater, Whistleblower"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Provenance Box */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Provenance & Acquisition Notes
                </label>
                <input
                  type="text"
                  value={provenance}
                  onChange={(e) => setProvenance(e.target.value)}
                  placeholder="e.g. Declassified Senate Committee Box 84, Microfilm Roll 12"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploading || !file || !isAuthorized}
                  className="w-full py-2.5 px-4 bg-vault-dark hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Extracting, Chunking & Generating Vectors...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4 text-brand-400" />
                      <span>Ingest & Index Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Ingestion Rules & Pipelines (1 col) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <span className="font-mono uppercase font-bold text-slate-700 block pb-2 border-b border-slate-200">
              Pipeline Verification Rules
            </span>

            <div className="space-y-3 text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block font-serif">1. SHA-256 Deduplication</span>
                <p>
                  Every file buffer is hashed before extraction. Uploads with identical byte hashes
                  are rejected with 409 Conflict.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block font-serif">2. Recursive Chunking</span>
                <p>
                  Documents are split into overlapping 800-character segments with 150-character
                  context windows.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block font-serif">3. Full-Text & Vector Search</span>
                <p>
                  Records are simultaneously indexed into PostgreSQL FTS (English tsvector) and
                  vector cosine matrices.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ingestion Jobs Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-sm">
                Ingestion Processing Jobs History
              </h3>
              <p className="text-[11px] text-slate-500">Live processing status and retry controls</p>
            </div>
            <button
              onClick={fetchJobs}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition"
              title="Refresh Jobs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingJobs ? (
            <div className="text-center py-8 text-xs text-slate-400 font-mono">
              Loading ingestion jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No jobs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Chunks</th>
                    <th className="py-2.5 px-3">Content Hash</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                        {job.filename}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : job.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{job.totalChunks}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[10px]">
                        {job.contentHash.slice(0, 12)}...
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                        {job.createdAt.split('T')[0]}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {job.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(job.id)}
                            className="text-brand-600 hover:underline font-semibold"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
