import React from 'react';
import { X, ExternalLink, FileText, CheckCircle2, Calendar, User, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VerifiedCitation } from '../../types';

interface EvidenceDrawerProps {
  citation: VerifiedCitation | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-600 text-white font-mono text-sm font-bold flex items-center justify-center">
                {citation.citationIndex}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Archival Evidence Record</h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: {citation.documentId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Verification status alert */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">Verified Archival Grounding</h4>
                <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                  This citation is directly corroborated by preserved newsroom records with{' '}
                  <span className="font-semibold font-mono">
                    {(citation.confidenceScore * 100).toFixed(0)}% confidence
                  </span>
                  .
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Source Document
              </span>
              <h2 className="text-base font-serif font-bold text-slate-900 mt-1 leading-snug">
                {citation.documentTitle}
              </h2>
            </div>

            {/* Metadata Grid */}
            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">Author:</span>
                <span className="text-slate-900 ml-auto">
                  {citation.authorName || 'Staff Correspondent'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">Publication:</span>
                <span className="text-slate-900 ml-auto">
                  {citation.publicationName || 'Historical Archive'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium">Archived Date:</span>
                <span className="text-slate-900 font-mono ml-auto">
                  {citation.publicationDate}
                </span>
              </div>
              {citation.originalSourceUrl && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  <a
                    href={citation.originalSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline truncate ml-auto"
                  >
                    Original Reference Link
                  </a>
                </div>
              )}
            </div>

            {/* Supporting Excerpt Passage */}
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Corroborating Archive Passage
              </span>
              <div className="mt-2 bg-amber-50/70 border-l-4 border-amber-500 p-4 rounded-r-lg font-serif text-slate-800 text-sm leading-relaxed italic shadow-inner">
                "{citation.excerptText}"
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <Link
              to={`/documents/${citation.documentId}`}
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-vault-dark hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-sm transition"
            >
              <FileText className="w-4 h-4 text-brand-400" />
              Open Full Document & Context
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
