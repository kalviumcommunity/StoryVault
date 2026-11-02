import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  Users,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Save,
} from 'lucide-react';
import { api } from '../services/api';
import { EvidenceDrawer } from '../components/common/EvidenceDrawer';
import { ResearchBrief, VerifiedCitation } from '../types';
import { useAuth } from '../context/AuthContext';

export const BriefDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCitation, setActiveCitation] = useState<VerifiedCitation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editStatus, setEditStatus] = useState<string>('DRAFT');

  useEffect(() => {
    const fetchBrief = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.getBrief(id);
        setBrief(res.brief);
        setEditTitle(res.brief.title);
        setEditSummary(res.brief.executiveSummary);
        setEditStatus(res.brief.status);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrief();
  }, [id]);

  const handleSaveEdit = async () => {
    if (!id || !brief) return;
    try {
      const updated = await api.updateBrief(id, {
        ...brief,
        title: editTitle,
        executiveSummary: editSummary,
        status: editStatus,
      });
      setBrief({ ...brief, ...updated.brief });
      setIsEditing(false);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleDownloadMarkdown = async () => {
    if (!id) return;
    try {
      const res = await api.exportBrief(id);
      const blob = new Blob([res.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brief?.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'brief'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-light flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-mono text-sm">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          Compiling research brief...
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="min-h-screen bg-vault-light py-16 text-center">
        <p className="text-slate-600">Research brief not found.</p>
        <Link to="/briefs" className="text-brand-600 font-semibold mt-2 inline-block">
          ← Back to Briefs
        </Link>
      </div>
    );
  }

  const canEdit =
    !!user &&
    (brief.createdBy?.id === user.id || user.role === 'ADMIN' || user.role === 'EDITOR');

  return (
    <div className="min-h-screen bg-vault-light py-8 print:bg-white print:py-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            to="/briefs"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Research Briefs
          </Link>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Editing' : 'Edit Brief'}</span>
              </button>
            )}

            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 text-brand-600" />
              <span>Export Markdown</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-dark hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5 text-brand-400" />
              <span>Print Brief (PDF)</span>
            </button>
          </div>
        </div>

        {/* Main Editorial Document Container */}
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm space-y-10 print:border-none print:shadow-none print:p-0">
          {/* Brief Header */}
          <div className="border-b border-slate-200 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                StoryVault Investigative Brief
              </span>
              <span className="font-mono text-xs uppercase px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                Status: {brief.status}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-2xl font-serif font-bold p-2 border border-slate-300 rounded"
                />
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="text-xs p-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </select>
              </div>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 leading-tight">
                {brief.title}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
              <span>Author: {brief.createdBy?.name || 'Staff Correspondent'}</span>
              <span>•</span>
              <span>Topic: {brief.topic || 'General Archive Inquiry'}</span>
              <span>•</span>
              <span>
                Generated: {brief.createdAt ? new Date(brief.createdAt).toISOString().split('T')[0] : ''}
              </span>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <section className="space-y-3">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 border-b border-brand-100 pb-1 flex items-center gap-2">
              <span>1.</span> Executive Summary
            </h2>
            {isEditing ? (
              <textarea
                rows={4}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="w-full text-sm font-serif p-3 border border-slate-300 rounded"
              />
            ) : (
              <p className="text-slate-800 font-serif text-base leading-relaxed">
                {brief.executiveSummary}
              </p>
            )}
            {isEditing && (
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded font-semibold"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
            )}
          </section>

          {/* Section 2: Historical Timeline */}
          <section className="space-y-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 border-b border-brand-100 pb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>2.</span> Historical Chronological Timeline
            </h2>
            <div className="space-y-3 pl-2 border-l-2 border-slate-200">
              {brief.historicalTimeline?.map((item, idx) => (
                <div key={idx} className="relative pl-6">
                  <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-white"></span>
                  <div className="font-mono text-xs font-bold text-slate-900">{item.date}</div>
                  <p className="font-serif text-sm text-slate-700 mt-0.5">{item.event}</p>
                  <div className="text-[11px] font-mono text-brand-600 mt-0.5">
                    Source: {item.sourceTitle}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Key People and Organizations */}
          <section className="space-y-3">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 border-b border-brand-100 pb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" />
              <span>3.</span> Key People & Organizations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {brief.keyEntities?.map((ent, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900 font-serif text-sm">{ent.name}</div>
                  <div className="text-slate-500 font-mono mt-0.5">
                    {ent.role || ent.entityType || 'Key Entity'} • Mentioned in {ent.count} records
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Relevant Previous Events */}
          <section className="space-y-3">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 border-b border-brand-100 pb-1 flex items-center gap-2">
              <span>4.</span> Relevant Precursor Events & Context
            </h2>
            <div className="space-y-3">
              {brief.previousEvents?.map((pe, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="font-bold font-serif text-slate-900 text-sm">{pe.event}</div>
                  <p className="text-slate-600 font-serif">{pe.context}</p>
                  <div className="text-slate-500 font-mono text-[11px]">
                    Significance: {pe.significance}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Supporting Evidence with Citations */}
          <section className="space-y-3">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 border-b border-brand-100 pb-1 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-brand-600" />
              <span>5.</span> Supporting Archival Evidence & Corroboration
            </h2>
            <div className="space-y-3">
              {brief.supportingEvidence?.map((se, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="font-serif text-slate-800 text-sm leading-relaxed">
                      {se.claim}{' '}
                      <span className="font-mono font-bold text-brand-700 bg-white px-1.5 py-0.5 rounded border border-brand-300">
                        [{se.citationIndex}]
                      </span>
                    </p>
                    <div className="text-[11px] font-mono text-emerald-800">
                      Corroboration Confidence: {(se.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 6: Conflicting or Inconsistent Accounts */}
          <section className="space-y-3">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 border-b border-brand-100 pb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>6.</span> Conflicting or Inconsistent Accounts
            </h2>
            <div className="space-y-3">
              {brief.conflictingAccounts?.map((ca, idx) => (
                <div key={idx} className="p-4 bg-amber-50/50 rounded-lg border border-amber-200 text-xs space-y-2">
                  <div className="font-bold font-serif text-amber-900 text-sm">{ca.topic}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-serif">
                    <div className="p-2.5 bg-white rounded border border-amber-200">
                      <span className="block font-bold text-slate-900 mb-1">Account A:</span>
                      <p className="text-slate-700">{ca.accountA}</p>
                    </div>
                    <div className="p-2.5 bg-white rounded border border-amber-200">
                      <span className="block font-bold text-slate-900 mb-1">Account B:</span>
                      <p className="text-slate-700">{ca.accountB}</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">{ca.sourceDetails}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: Knowledge Gaps & Unanswered Questions */}
          <section className="space-y-3">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 border-b border-brand-100 pb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-600" />
              <span>7.</span> Knowledge Gaps & Open Investigative Questions
            </h2>
            <div className="space-y-2">
              {brief.knowledgeGaps?.map((kg, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900 font-serif text-sm">Q: {kg.question}</div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Archival Limitation: {kg.reasonForUncertainty}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 8: Source List and Attribution */}
          <section className="space-y-3 pt-6 border-t border-slate-200">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-brand-800 pb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>8.</span> Preserved Source Attributions
            </h2>
            <div className="space-y-3">
              {brief.citations?.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start gap-3 hover:border-brand-300 transition"
                >
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {c.citationIndex}
                  </span>
                  <div className="space-y-1 flex-1">
                    <Link
                      to={`/documents/${c.document.id}`}
                      className="font-serif font-bold text-slate-900 hover:text-brand-600 transition flex items-center gap-1"
                    >
                      {c.document.title} <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <div className="font-mono text-[11px] text-slate-500">
                      {c.document.author?.name || 'Staff'} • {c.document.publication?.name} •{' '}
                      {c.document.publicationDate.split('T')[0]}
                    </div>
                    <p className="font-serif italic text-slate-700 bg-white p-2 rounded border border-slate-200 text-[11px]">
                      "{c.excerptText}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Evidence Drawer for Clicked Citations */}
        <EvidenceDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
      </div>
    </div>
  );
};
