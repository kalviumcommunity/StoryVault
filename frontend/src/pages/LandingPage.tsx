import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bot,
  FileCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  Database,
  Quote,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [quickQuery, setQuickQuery] = useState('');

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(quickQuery)}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div className="min-h-screen bg-vault-light flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-vault-dark text-white overflow-hidden py-20 lg:py-28 border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-brand-300 text-xs font-mono mb-6">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Evidence-Grounded Newsroom Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white leading-tight">
              Decades of Newsroom Archives.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-sky-200">
                Instantly Corroborated.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
              StoryVault empowers journalists and investigators to search historical records with
              natural language, discover hidden entity connections, and generate research briefs
              with transparent, passage-level citations.
            </p>

            {/* Interactive Hero Search Preview */}
            <form
              onSubmit={handleQuickSearch}
              className="mt-8 max-w-2xl mx-auto flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-slate-700 shadow-2xl focus-within:border-brand-400 transition"
            >
              <div className="pl-3 text-slate-400">
                <Search className="w-5 h-5 text-brand-400" />
              </div>
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search archive: e.g. 'Apex Petrochemical', 'Silvergate Tapes', 'Orbital Relay'..."
                className="w-full bg-transparent px-3 py-2 text-white placeholder-slate-400 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition shrink-0"
              >
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Public entry points */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 font-mono">Explore without an account:</span>
              <Link
                to="/search"
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-brand-300 px-3 py-1 rounded-md font-medium transition"
              >
                Search the Public Archive
              </Link>
              <Link
                to="/assistant"
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-brand-300 px-3 py-1 rounded-md font-medium transition"
              >
                Ask the Research Assistant
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Core Newsroom Problem & Solution */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-brand-700 font-semibold">
                The Media Archive Crisis
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-2">
                Unstructured Archives vs. Developing Deadlines
              </h2>
              <p className="mt-4 text-slate-600 text-sm leading-relaxed">
                Media houses preserve millions of pages across microfilms, reporter notebooks, leaked
                memos, and footage notes. Yet when a developing story breaks, journalists cannot
                verify past reporting under tight deadlines.
              </p>
              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                  <span>
                    <strong>Chatbots hallucinate:</strong> Generic LLMs invent dates, fictionalize
                    quotes, and cannot provide verified audit trails.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 mt-1 shrink-0" />
                  <span>
                    <strong>StoryVault verifies:</strong> Every factual synthesis is anchored to
                    precise document chunks, linking every claim to its archived evidence.
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                <Quote className="w-5 h-5 text-brand-600" />
                <h3 className="font-serif font-bold text-slate-900 text-sm">
                  StoryVault Research Integrity Guarantee
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-serif italic leading-relaxed">
                "StoryVault behaves like a seasoned investigative researcher rather than a chatbot.
                It never fabricates sources, clearly flags knowledge gaps when records are absent,
                and distinguishes verified archive records from AI synthesis."
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="block text-lg font-bold font-mono text-slate-900">100%</span>
                  <span className="text-[11px] text-slate-500">Source Grounded</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="block text-lg font-bold font-mono text-slate-900">RRF</span>
                  <span className="text-[11px] text-slate-500">Hybrid Search</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="block text-lg font-bold font-mono text-slate-900">RBAC</span>
                  <span className="text-[11px] text-slate-500">4 User Roles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="py-16 bg-vault-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
              Engineered for Investigative Excellence
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Comprehensive context retrieval, cross-referenced entities, and print-ready briefs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-slate-900 text-base">Universal Search</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                PostgreSQL full-text search combined with vector semantic embeddings via Reciprocal
                Rank Fusion.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-slate-900 text-base">AI Research Assistant</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Answers grounded solely in retrieved documents with interactive inline numbered
                citations linked to source passages.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-slate-900 text-base">8-Section Brief Builder</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Generates timelines, key entities, conflicting accounts, knowledge gaps, and
                printable Markdown reports.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-slate-900 text-base">Timeline & Entity Graph</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Visual relationship network connecting people, organizations, locations, and
                chronological archive events.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white text-sm">StoryVault</span>
            <span>— AI-Powered Media Archive Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/search" className="hover:text-white transition">
              Search Archive
            </Link>
            <Link to="/assistant" className="hover:text-white transition">
              Research Assistant
            </Link>
            <Link to="/timeline" className="hover:text-white transition">
              Timeline & Entity Graph
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
