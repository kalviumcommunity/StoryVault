import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Sparkles,
  ExternalLink,
  Calendar,
  User,
  CheckCircle2,
  Trash2,
  Download,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ResearchBrief } from '../types';

export const BriefBuilderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<ResearchBrief[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate brief modal state
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchBriefs = async () => {
    setLoading(true);
    try {
      const res = await api.getBriefs();
      setBriefs(res.briefs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const res = await api.generateBrief(topic);
      // Automatically save generated draft
      const saveRes = await api.saveBrief({
        ...res.brief,
        status: 'DRAFT',
      });
      setShowModal(false);
      navigate(`/briefs/${saveRes.brief.id}`);
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this research brief?')) return;
    try {
      await api.deleteBrief(id);
      setBriefs(briefs.filter((b) => b.id !== id));
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
              <FileText className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Investigative Research Briefs
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {user
                ? 'Generate and review structured 8-section research dossiers with verified citations and timeline provenance.'
                : 'Browse published research briefs with verified citations and timeline provenance.'}
            </p>
          </div>

          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
            >
              <Sparkles className="w-4 h-4" />
              Generate New Brief
            </button>
          )}
        </div>

        {/* Briefs List */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500 font-mono">Loading saved briefs...</p>
          </div>
        ) : briefs.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-slate-900 text-base">No Research Briefs Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Generate a comprehensive structured investigative brief from any archive topic or developing inquiry.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 bg-vault-dark hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Build Brief
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {briefs.map((brief) => (
              <div
                key={brief.id}
                onClick={() => navigate(`/briefs/${brief.id}`)}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-brand-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {brief.status}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {brief.updatedAt ? new Date(brief.updatedAt).toISOString().split('T')[0] : ''}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-slate-900 text-base group-hover:text-brand-600 transition line-clamp-2">
                    {brief.title}
                  </h3>

                  {brief.topic && (
                    <span className="inline-block text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Topic: {brief.topic}
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{brief.createdBy?.name || 'Journalist'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {(user?.role === 'ADMIN' || user?.id === brief.createdBy?.id) && (
                      <button
                        onClick={(e) => handleDelete(brief.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete Brief"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-brand-600 font-semibold flex items-center gap-0.5">
                      Open <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate Brief Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-600" />
                <h3 className="font-serif font-bold text-slate-900 text-base">
                  Generate Structured Research Brief
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter an investigative topic or story subject. StoryVault will query preserved records,
                compile verified timelines, extract key entities, synthesize evidence, and structure an
                8-section report.
              </p>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Investigative Inquiry / Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Apex Petrochemical Well Contamination"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating || !topic.trim()}
                    className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Synthesizing 8 Sections...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Brief
                      </>
                    )}
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
