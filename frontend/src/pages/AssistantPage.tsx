import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  FileText,
  ExternalLink,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { EvidenceDrawer } from '../components/common/EvidenceDrawer';
import { ChatHistoryMessage, VerifiedCitation, ResearchAnswer } from '../types';
import { DocTypeBadge } from '../components/common/Badge';

export const AssistantPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchAnswer | null>(null);
  const [activeCitation, setActiveCitation] = useState<VerifiedCitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryMessage[]>([]);

  const samplePrompts = [
    'What was uncovered regarding Apex Petrochemical well microfractures?',
    'Summarize the declassified Silvergate surveillance tapes and Senator Sterling.',
    'What occurred during the Project Helios orbital relay launch abort?',
    'Federal Trade Commission findings on the transatlantic telecom cartel floor price.',
  ];

  const handleAsk = async (textToAsk: string) => {
    if (!textToAsk.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.askAssistant(textToAsk, chatHistory.slice(-12));
      setResult(res);
      const userMessage: ChatHistoryMessage = { role: 'user', content: textToAsk };
      const assistantMessage: ChatHistoryMessage = { role: 'assistant', content: res.answer };
      setChatHistory((history) => [...history, userMessage, assistantMessage].slice(-12));
    } catch (err: any) {
      alert(`Research query failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(query);
  };

  const handleCopyAnswer = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render inline citation pills in the answer text
  const renderFormattedAnswer = (text: string) => {
    // Replace [1], [2], etc. with interactive clickable badges
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citeIndex = parseInt(match[1], 10);
        const citation = result?.citations.find((c) => c.citationIndex === citeIndex);
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (citation) setActiveCitation(citation);
            }}
            className="inline-flex items-center justify-center font-mono font-bold text-[11px] px-1.5 py-0.2 mx-0.5 rounded bg-brand-100 text-brand-800 hover:bg-brand-600 hover:text-white border border-brand-300 transition align-baseline shadow-xs"
            title={citation ? `View source: "${citation.documentTitle}"` : 'Archival Source'}
          >
            [{citeIndex}]
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                AI Research Assistant
              </h1>
              <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Strict Grounding Active
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Inquiries are strictly answered from preserved newsroom records. Click any numbered
              citation to inspect the underlying source passage.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Mode: {result?.providerMode || 'Evidence Grounded'}
          </div>
        </div>

        {/* Query Input Box */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask an investigative research question grounded in newsroom archives..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-vault-dark hover:bg-slate-800 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-sm flex items-center gap-2 transition disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-brand-400" />
                  <span>Ask Assistant</span>
                </>
              )}
            </button>
          </form>

          {/* Sample Prompts */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[11px] font-mono text-slate-400 font-semibold">Example Queries:</span>
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(prompt);
                  handleAsk(prompt);
                }}
                className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Results Layout: Answer View (Left) & Source Panel (Right) */}
        {loading && (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-600 font-mono">
              Retrieving historical documents, cross-referencing passages, and verifying citations...
            </p>
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Answer Card (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-5">
                {/* Status Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-serif font-bold text-slate-900">
                      Archive Corroborated Synthesis
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                      {(result.confidenceScore * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  <button
                    onClick={handleCopyAnswer}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded hover:bg-slate-100 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Answer</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Evidence limitation warning if not sufficient */}
                {!result.hasSufficientEvidence && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">Knowledge Gap Flagged</h4>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        The current archive does not contain sufficient verified evidence to answer this
                        query. StoryVault will not invent historical facts without preserved source documents.
                      </p>
                    </div>
                  </div>
                )}

                {/* Formatted Text Body with interactive inline citations */}
                <div className="font-serif text-slate-800 text-sm leading-relaxed whitespace-pre-line space-y-3">
                  {renderFormattedAnswer(result.answer)}
                </div>

                {/* Interactive Citations Summary Bar */}
                {result.citations.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
                      Click to inspect verified citations:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.citations.map((c) => (
                        <button
                          key={c.citationIndex}
                          type="button"
                          onClick={() => setActiveCitation(c)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 text-xs text-slate-700 transition"
                        >
                          <span className="w-4 h-4 rounded-full bg-brand-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                            {c.citationIndex}
                          </span>
                          <span className="font-medium truncate max-w-[200px]">
                            {c.documentTitle}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Source Panel Sidebar (1 col) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-mono uppercase font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                  Retrieved Archive Sources ({result.retrievedSources.length})
                </span>
              </div>

              {result.retrievedSources.length === 0 ? (
                <p className="text-xs text-slate-400">No sources retrieved.</p>
              ) : (
                <div className="space-y-3">
                  {result.retrievedSources.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-5 h-5 rounded-full bg-brand-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                          {s.index}
                        </span>
                        <DocTypeBadge type={s.documentType} />
                      </div>

                      <h4 className="font-serif font-bold text-slate-900 line-clamp-2">{s.title}</h4>

                      <div className="text-[10px] font-mono text-slate-500">
                        {s.author} • {s.publication} • {s.date}
                      </div>

                      <p className="text-[11px] text-slate-600 italic line-clamp-3">"{s.snippet}"</p>

                      <div className="pt-1 border-t border-slate-200">
                        <a
                          href={`/documents/${s.id}`}
                          className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          View Document <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Evidence Drawer for Clicked Citations */}
        <EvidenceDrawer citation={activeCitation} onClose={() => setActiveCitation(null)} />
      </div>
    </div>
  );
};
