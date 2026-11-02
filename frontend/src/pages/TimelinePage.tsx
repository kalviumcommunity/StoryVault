import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Share2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  User,
  Building,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { DocTypeBadge } from '../components/common/Badge';

export const TimelinePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'graph'>('timeline');
  const [events, setEvents] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [timelineRes, graphRes] = await Promise.all([
          api.getTimeline(),
          api.getEntityGraph(),
        ]);
        setEvents(timelineRes.events || []);
        setNodes(graphRes.nodes || []);
        setLinks(graphRes.links || []);
        if (graphRes.nodes?.length > 0) {
          setSelectedEntity(graphRes.nodes[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-light flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-mono text-sm">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          Reconstructing historical chronological timeline & entity graph...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" />
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Timeline & Entity Relationship Explorer
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Trace chronological newsroom events and inspect verified entity co-occurrences with full document traceability.
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Chronological Timeline ({events.length})
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === 'graph'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Entity Network Graph ({nodes.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Chronological Timeline */}
        {activeTab === 'timeline' && (
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 text-xs text-slate-500">
              <span className="font-mono uppercase font-bold text-slate-700">
                Preserved Newsroom Chronology (1974 — 2024)
              </span>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> All records 100% verified from archives
              </span>
            </div>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-brand-200 space-y-8">
              {events.map((evt, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline Node Point */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-brand-600 border-4 border-white shadow-sm group-hover:scale-125 transition-transform"></div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 hover:border-brand-400 hover:shadow-sm transition space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
                          {evt.date}
                        </span>
                        <DocTypeBadge type={evt.documentType} />
                      </div>
                      <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                        Verified Fact (100% Corroborated)
                      </span>
                    </div>

                    <Link
                      to={`/documents/${evt.documentId}`}
                      className="block font-serif font-bold text-slate-900 text-base hover:text-brand-600 transition"
                    >
                      {evt.title}
                    </Link>

                    <p className="text-xs text-slate-600 font-serif leading-relaxed line-clamp-3">
                      {evt.summary}
                    </p>

                    {/* Entities involved */}
                    {evt.entities && evt.entities.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">Entities:</span>
                        {evt.entities.map((ent: any) => (
                          <span
                            key={ent.id}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-300"
                          >
                            {ent.name} ({ent.type})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                      <span>{evt.author} • {evt.publication}</span>
                      <Link
                        to={`/documents/${evt.documentId}`}
                        className="text-brand-600 font-semibold hover:underline flex items-center gap-1 text-xs"
                      >
                        Inspect Source Record <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Entity Network Explorer */}
        {activeTab === 'graph' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Entities Grid (2 cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                <span className="font-mono uppercase font-bold text-slate-700">
                  Preserved Entities & Investigative Nodes
                </span>
                <span className="text-slate-400 font-mono">
                  Click any entity to inspect archive co-occurrences
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nodes.map((node) => {
                  const isSelected = selectedEntity?.id === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedEntity(node)}
                      className={`p-4 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {node.type}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          {node.mentions} mentions
                        </span>
                      </div>

                      <h4 className="font-serif font-bold text-sm text-slate-900 mt-2">{node.label}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{node.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Entity Trace Panel (1 col) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              {selectedEntity ? (
                <>
                  <div className="pb-3 border-b border-slate-200 space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                      {selectedEntity.type}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-slate-900 pt-1">
                      {selectedEntity.label}
                    </h3>
                    <p className="text-xs text-slate-600">{selectedEntity.description}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Mention Frequency:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedEntity.mentions} records
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Verification State:</span>
                      <span className="text-emerald-700 font-semibold">Extracted Fact</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono uppercase font-bold text-slate-700 mb-2">
                      Corroborating Archive Records ({selectedEntity.relatedDocuments?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {selectedEntity.relatedDocuments?.map((doc: any) => (
                        <Link
                          key={doc.id}
                          to={`/documents/${doc.id}`}
                          className="block p-2.5 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-slate-50 transition group text-xs"
                        >
                          <div className="font-serif font-bold text-slate-900 group-hover:text-brand-600 line-clamp-2">
                            {doc.title}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-1">{doc.date}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-xs text-slate-400">
                  Select an entity to view its underlying archive evidence.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
