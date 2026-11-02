import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  Calendar,
  FileText,
  User,
  ArrowRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { DocTypeBadge, AccessBadge } from '../components/common/Badge';
import { SearchResultItem } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<'hybrid' | 'keyword' | 'semantic'>('hybrid');
  const [documentType, setDocumentType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [semanticIndexAvailable, setSemanticIndexAvailable] = useState(true);
  const [searchError, setSearchError] = useState('');

  // Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const performSearch = async (targetPage = 1) => {
    setLoading(true);
    setSearchError('');
    try {
      const res = await api.search({
        query,
        mode,
        documentType: documentType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: targetPage,
        limit: 8,
      });
      setResults(res.results || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
      setSemanticIndexAvailable(res.semanticIndexAvailable);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Archive search failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, documentType, startDate, endDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setSearchParams(query ? { q: query } : {});
    performSearch(1);
  };

  // Suggestions fetch
  useEffect(() => {
    if (query.trim().length > 1) {
      api.getSuggestions(query).then((res) => setSuggestions(res.suggestions || []));
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleSaveSearch = async () => {
    if (!query) return;
    try {
      await api.saveSearch(`Search: ${query}`, query, { mode, documentType });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search Header Banner */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            Universal Newsroom Archive Search
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Query across historical articles, declassified leak memos, interview transcripts, and footage logs.
          </p>

          {/* Search Input Bar */}
          <form onSubmit={handleSubmit} className="mt-5 relative">
            <div className="flex items-center bg-slate-50 rounded-xl p-1.5 border border-slate-300 shadow-inner focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition">
              <div className="pl-3 text-slate-400">
                <Search className="w-5 h-5 text-brand-600" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search historical entities, topics, transcripts, quotes, or events..."
                className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-vault-dark hover:bg-slate-800 text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition shrink-0"
              >
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Typeahead Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-2 divide-y divide-slate-100">
                <div className="px-3 py-1 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Archive Suggestions:
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(s.text);
                      setShowSuggestions(false);
                      setSearchParams({ q: s.text });
                      performSearch(1);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition"
                  >
                    <span className="font-medium text-slate-800">{s.text}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      {s.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Search Mode Pill Selectors */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-mono mr-1">Retrieval Pipeline:</span>
              <button
                type="button"
                onClick={() => setMode('hybrid')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  mode === 'hybrid'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Hybrid (RRF Fusion)
              </button>

              <button
                type="button"
                onClick={() => setMode('keyword')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  mode === 'keyword'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Keyword (PostgreSQL FTS)
              </button>

              <button
                type="button"
                onClick={() => setMode('semantic')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                  mode === 'semantic'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Semantic (Vector Cosine)
              </button>
            </div>

            {query && (
              <button
                onClick={handleSaveSearch}
                className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 font-medium px-2 py-1 rounded hover:bg-brand-50 transition"
              >
                {savedSuccess ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Saved!
                  </span>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    Save Search Query
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Main Search Content: Filters + Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Filters Sidebar */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-brand-600" /> Archive Filters
              </span>
              {(documentType || startDate || endDate) && (
                <button
                  onClick={() => {
                    setDocumentType('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Document Classification
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All Document Types</option>
                <option value="ARTICLE">Investigative Article</option>
                <option value="INTERVIEW_TRANSCRIPT">Interview Transcript</option>
                <option value="LEAK_MEMO">Leak Memo</option>
                <option value="FOOTAGE_NOTE">Archival Footage Note</option>
                <option value="HISTORICAL_REPORT">Historical Lore Report</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Historical Date Range
              </label>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">From Date:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">To Date:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Active search summary */}
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 font-mono">
              Mode: <span className="text-slate-800 font-semibold">{mode.toUpperCase()}</span>
            </div>
          </div>

          {/* Search Results Column (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {!semanticIndexAvailable && mode !== 'keyword' && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                Gemini semantic vectors are not fully indexed yet. Hybrid mode is using keyword
                results until an administrator runs the embedding reindex command.
              </div>
            )}
            {searchError && (
              <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                {searchError}
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Found <strong className="text-slate-900">{total}</strong> archived record
                {total !== 1 ? 's' : ''} (Page {page} of {totalPages})
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                Sorted by {mode.toUpperCase()} Relevance
              </span>
            </div>

            {loading ? (
              <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500 font-mono">Executing query across archive index...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-slate-900 text-base">
                  No matching archive records found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try broadening your search terms, switching to Semantic mode, or clearing your date filters.
                </p>
              </div>
            ) : (
              results.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition space-y-3"
                >
                  {/* Top metadata row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <DocTypeBadge type={item.documentType} />
                      <AccessBadge level={item.accessLevel} />
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.searchModeMatch.toUpperCase()} MATCH
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Relevance Score: <span className="font-bold text-slate-700">{item.score}</span>
                    </div>
                  </div>

                  {/* Title & Link */}
                  <Link
                    to={`/documents/${item.id}`}
                    className="block font-serif font-bold text-slate-900 text-base hover:text-brand-600 transition"
                  >
                    {item.title}
                  </Link>

                  {/* Snippet */}
                  <p
                    className="text-xs text-slate-600 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                  ></p>

                  {/* Passage chunk preview if present */}
                  {item.relevantChunk && (
                    <div className="bg-slate-50 border-l-2 border-brand-500 p-2.5 rounded-r text-[11px] font-serif text-slate-700 italic line-clamp-2">
                      "{item.relevantChunk.content}"
                    </div>
                  )}

                  {/* Bottom source provenance */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {item.author?.name || 'Archive Staff'}
                      </span>
                      <span>•</span>
                      <span>{item.publication?.name || 'Newsroom Archive'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {item.publicationDate}
                      </span>
                    </div>

                    <Link
                      to={`/documents/${item.id}`}
                      className="text-brand-600 hover:text-brand-800 font-semibold text-xs flex items-center gap-1 transition"
                    >
                      Inspect Source <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm text-xs">
                <button
                  disabled={page <= 1}
                  onClick={() => performSearch(page - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="font-mono text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => performSearch(page + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
