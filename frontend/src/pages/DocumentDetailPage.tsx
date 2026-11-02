import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Calendar,
  User,
  Newspaper,
  Bookmark,
  Share2,
  Copy,
  Check,
  ShieldAlert,
  ArrowLeft,
  Layers,
  FileText,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import { DocTypeBadge, AccessBadge, RoleBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight') || '';
  const { user } = useAuth();

  const [document, setDocument] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Add to collection modal
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionNotes, setCollectionNotes] = useState('');
  const [collectionSuccess, setCollectionSuccess] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.getDocument(id, highlight);
        setDocument(res.document);
        setRelated(res.relatedDocuments || []);
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 403) {
          setError(
            err.message ||
              'Access Restricted: Your current clearance role is insufficient to view this document.'
          );
        } else {
          setError(err.message || 'Failed to retrieve document record.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id, highlight]);

  const handleCopyCitation = () => {
    if (!document) return;
    const author = document.author?.name || 'Staff';
    const pub = document.publication?.name || 'StoryVault Archive';
    const date = document.publicationDate;
    const title = document.title;
    const citation = `"${title}." Reported by ${author}. ${pub}, ${date}. Preserved in StoryVault Archive (Record ID: ${document.id}).`;

    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const openCollectionModal = async () => {
    if (!user) {
      alert('Please sign in to add documents to a research collection.');
      return;
    }
    setShowCollectionModal(true);
    try {
      const res = await api.getCollections();
      setCollections(res.collections || []);
      if (res.collections?.length > 0) {
        setSelectedCollectionId(res.collections[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollectionId || !document) return;
    try {
      await api.addDocumentToCollection(selectedCollectionId, document.id, collectionNotes);
      setCollectionSuccess(true);
      setTimeout(() => {
        setCollectionSuccess(false);
        setShowCollectionModal(false);
        setCollectionNotes('');
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-light flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-mono text-sm">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          Retrieving archival record...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-vault-light py-16 px-4">
        <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl border border-rose-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
            <Link
              to="/search"
              className="text-xs font-semibold px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
            >
              Back to Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Archive Search
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCitation}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Citation Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Citation</span>
                </>
              )}
            </button>

            <button
              onClick={openCollectionModal}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Add to Collection</span>
            </button>
          </div>
        </div>

        {/* Document Header Card */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <DocTypeBadge type={document.documentType} />
            <AccessBadge level={document.accessLevel} />
            <span className="text-[11px] font-mono text-slate-400">
              Content Hash: {document.contentHash?.slice(0, 16)}...
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-tight">
            {document.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800">
                {document.author?.name || 'Archive Staff'}
              </span>
              {document.author?.title && (
                <span className="text-slate-400">({document.author.title})</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-slate-400" />
              <span>{document.publication?.name || 'Newsroom Archive'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-mono">{document.publicationDate}</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-slate-500">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>{document.wordCount} words</span>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Document Content Viewer (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 text-xs text-slate-400 font-mono">
                <span>PRESERVED ARCHIVAL DISPATCH</span>
                <span>ORIGINAL RECORD TEXT</span>
              </div>

              {/* Document Text Body */}
              <div
                className="prose prose-slate max-w-none font-serif text-slate-800 text-base leading-relaxed space-y-5"
                dangerouslySetInnerHTML={{
                  __html: (document.highlightedContent || document.content)
                    .split('\n\n')
                    .map((p: string) => `<p>${p}</p>`)
                    .join(''),
                }}
              />
            </div>

            {/* Chunks Inspector */}
            {document.chunks && document.chunks.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-600" />
                    Indexed Semantic Chunks ({document.chunks.length})
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Chunk size: 800 chars / 150 overlap
                  </span>
                </div>

                <div className="space-y-3">
                  {document.chunks.map((ch: any) => (
                    <div
                      key={ch.id}
                      className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-serif text-slate-700 leading-relaxed"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 pb-1 border-b border-slate-200">
                        <span>Chunk #{ch.chunkIndex}</span>
                        <span>{ch.tokenCount} Tokens</span>
                      </div>
                      "{ch.content}"
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Provenance & Related Records */}
          <div className="space-y-6">
            {/* Provenance Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-slate-900 text-xs uppercase tracking-wider font-mono">
                Provenance & Chain of Custody
              </h3>
              <p className="text-xs text-slate-600 font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {document.provenance || 'Standard archival acquisition.'}
              </p>
              {document.originalFilename && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Original File: <span className="text-slate-800">{document.originalFilename}</span>
                </div>
              )}
            </div>

            {/* Related Archive Documents */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-slate-900 text-xs uppercase tracking-wider font-mono">
                Correlated Archive Documents
              </h3>
              {related.length === 0 ? (
                <p className="text-xs text-slate-400">No related cross-references found.</p>
              ) : (
                <div className="space-y-3">
                  {related.map((rel: any) => (
                    <Link
                      key={rel.id}
                      to={`/documents/${rel.id}`}
                      className="block p-3 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-slate-50 transition group"
                    >
                      <h4 className="font-serif font-bold text-xs text-slate-900 group-hover:text-brand-600 line-clamp-2">
                        {rel.title}
                      </h4>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{rel.author?.name || 'Staff'}</span>
                        <span>{rel.publicationDate}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="font-serif font-bold text-slate-900 text-base">
              Add Record to Research Collection
            </h3>

            {collectionSuccess ? (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-xs font-semibold text-center">
                ✓ Document successfully saved to collection!
              </div>
            ) : collections.length === 0 ? (
              <div className="text-xs text-slate-600 space-y-3">
                <p>You have not created any research collections yet.</p>
                <Link
                  to="/collections"
                  className="inline-block text-brand-600 font-semibold hover:underline"
                >
                  Create a collection first →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleAddToCollection} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Collection
                  </label>
                  <select
                    value={selectedCollectionId}
                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Investigative Annotation / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                    placeholder="Why is this document relevant to your developing story?"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCollectionModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                  >
                    Save to Collection
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
