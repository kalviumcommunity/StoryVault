import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Plus,
  Trash2,
  FolderPlus,
  ExternalLink,
  Search,
  Lock,
  Globe,
  FileText,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { Collection } from '../types';
import { DocTypeBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const CollectionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'collections' | 'savedSearches'>('collections');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Collection Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const colRes = await api.getCollections();
      setCollections(colRes.collections || []);
      if (user) {
        const searchRes = await api.getSavedSearches();
        setSavedSearches(searchRes.savedSearches || []);
      } else {
        setSavedSearches([]);
      }
      if (colRes.collections?.length > 0) {
        const fullCol = await api.getCollection(colRes.collections[0].id);
        setSelectedCollection(fullCol.collection);
      } else {
        setSelectedCollection(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) setActiveTab('collections');
    loadData();
  }, [user]);

  const handleSelectCollection = async (id: string) => {
    try {
      const res = await api.getCollection(id);
      setSelectedCollection(res.collection);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await api.createCollection({ name, description, isPublic });
      setShowModal(false);
      setName('');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      await api.deleteCollection(id);
      if (selectedCollection?.id === id) setSelectedCollection(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveDoc = async (colId: string, docId: string) => {
    try {
      await api.removeDocumentFromCollection(colId, docId);
      handleSelectCollection(colId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                {user ? 'Research Collections & Saved Searches' : 'Public Research Collections'}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Organize curated evidence dossiers for developing investigative stories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('collections')}
                className={`px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'collections'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Collections ({collections.length})
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab('savedSearches')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition ${
                    activeTab === 'savedSearches'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Saved Searches ({savedSearches.length})
                </button>
              )}
            </div>

            {user && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm transition"
              >
                <FolderPlus className="w-4 h-4" />
                New Collection
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Collections View */}
        {activeTab === 'collections' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Collections List (1 col) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <span className="font-mono text-xs uppercase font-bold text-slate-700 block pb-2 border-b border-slate-200">
                {user ? 'Your Investigative Collections' : 'Public Investigative Collections'}
              </span>

              {collections.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No collections created yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map((col) => {
                    const isSelected = selectedCollection?.id === col.id;
                    return (
                      <div
                        key={col.id}
                        onClick={() => handleSelectCollection(col.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif font-bold text-sm text-slate-900 line-clamp-1">
                            {col.name}
                          </h4>
                          {user &&
                            (col.ownerId === user.id || user.role === 'ADMIN') && (
                              <button
                                onClick={(e) => handleDeleteCollection(col.id, e)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                title="Delete Collection"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {col.description || 'No description added.'}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>{col._count?.items || 0} documents</span>
                          <span className="flex items-center gap-1">
                            {col.isPublic ? (
                              <>
                                <Globe className="w-3 h-3 text-emerald-600" /> Public
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-slate-400" /> Private
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Collection Contents (2 cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              {selectedCollection ? (
                <>
                  <div className="pb-4 border-b border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-serif font-bold text-slate-900">
                        {selectedCollection.name}
                      </h2>
                      <span className="font-mono text-xs text-slate-500">
                        Curated by: {selectedCollection.owner?.name || 'You'}
                      </span>
                    </div>
                    {selectedCollection.description && (
                      <p className="text-xs text-slate-600 font-serif">
                        {selectedCollection.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-mono uppercase font-bold text-slate-700 block">
                      Archived Documents ({selectedCollection.items?.length || 0})
                    </span>

                    {selectedCollection.items?.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        No documents added to this collection yet. Search archive and click "Add to Collection".
                      </div>
                    ) : (
                      selectedCollection.items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <DocTypeBadge type={item.document.documentType} />
                            {user &&
                              (selectedCollection.ownerId === user.id || user.role === 'ADMIN') && (
                                <button
                                  onClick={() => handleRemoveDoc(selectedCollection.id, item.document.id)}
                                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              )}
                          </div>

                          <Link
                            to={`/documents/${item.document.id}`}
                            className="block font-serif font-bold text-slate-900 text-sm hover:text-brand-600 transition"
                          >
                            {item.document.title}
                          </Link>

                          {item.notes && (
                            <div className="p-2.5 rounded bg-white border border-slate-200 text-xs font-serif text-slate-700 italic">
                              Note: "{item.notes}"
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                            <span>{item.document.author?.name || 'Staff'} • {item.document.publicationDate}</span>
                            <Link
                              to={`/documents/${item.document.id}`}
                              className="text-brand-600 font-semibold flex items-center gap-1"
                            >
                              Open Record <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Select a collection on the left to inspect its bookmarked evidence records.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Saved Searches */}
        {user && activeTab === 'savedSearches' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <span className="font-mono text-xs uppercase font-bold text-slate-700 block pb-2 border-b border-slate-200">
              Saved Newsroom Query Presets
            </span>

            {savedSearches.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No search queries saved yet. Run a search and click "Save Search Query".
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {savedSearches.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-slate-900">{s.name}</h4>
                      <p className="text-xs font-mono text-slate-500">Query: "{s.query}"</p>
                    </div>

                    <button
                      onClick={() => navigate(`/search?q=${encodeURIComponent(s.query)}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition"
                    >
                      <Search className="w-3.5 h-3.5" /> Re-run Search
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Collection Modal */}
        {user && showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Create New Research Collection
              </h3>

              <form onSubmit={handleCreateCollection} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Collection Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Telecommunications Monopoly Investigation"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly state the research focus and investigative scope..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded text-brand-600"
                  />
                  <label htmlFor="isPublic" className="font-medium text-slate-700">
                    Make visible to newsroom colleagues (Public collection)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Create Collection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
