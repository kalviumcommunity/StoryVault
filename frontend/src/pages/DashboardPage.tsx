import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Layers,
  FileText,
  Bookmark,
  Users,
  Search,
  Bot,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { DocTypeBadge, AccessBadge, RoleBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = ['#0284c7', '#0d9488', '#6366f1', '#d97706', '#e11d48'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [metricsRes, briefsRes] = await Promise.all([
          api.getMetrics(),
          api.getBriefs(),
        ]);
        setData(metricsRes);
        setBriefs(briefsRes.briefs || []);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-light flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-mono text-sm">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          Loading stored newsroom metrics...
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                Editorial Research Intelligence Desk
              </h1>
              {user && <RoleBadge role={user.role} />}
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Real-time metrics
              synchronized with PostgreSQL 18 archive repository.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/search"
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              <Search className="w-3.5 h-3.5" />
              Universal Search
            </Link>
            <Link
              to="/assistant"
              className="flex items-center gap-1.5 bg-vault-dark hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              <Bot className="w-3.5 h-3.5 text-brand-400" />
              Ask Assistant
            </Link>
          </div>
        </div>

        {/* Real Stored Metrics Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Documents</span>
              <Archive className="w-4 h-4 text-sky-600" />
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalDocuments || 0}</span>
            <span className="block text-[10px] text-slate-500 mt-1">Indexed in archive</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Passages</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalChunks || 0}</span>
            <span className="block text-[10px] text-slate-500 mt-1">Searchable vector chunks</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Correspondents</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalAuthors || 0}</span>
            <span className="block text-[10px] text-slate-500 mt-1">Authors & investigators</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Publications</span>
              <Archive className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalPublications || 0}</span>
            <span className="block text-[10px] text-slate-500 mt-1">Press outlets & gazettes</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Briefs</span>
              <FileText className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalBriefs || 0}</span>
            <span className="block text-[10px] text-slate-500 mt-1">Saved research briefs</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Collections</span>
              <Bookmark className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-2xl font-bold font-mono text-slate-900">{metrics.totalCollections || 0}</span>
            <span className="block text-[10px] text-slate-500 mt-1">Investigative dossiers</span>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Type Distribution */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-sm">
                  Document Type Distribution
                </h3>
                <p className="text-[11px] text-slate-500">Breakdown of indexed media materials</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.typeDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    label={({ name, percent }: any) =>
                      `${name ? name.slice(0, 14) : ''} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {(data?.typeDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Access Clearance Level Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-sm">
                  Archive Access Clearance Coverage
                </h3>
                <p className="text-[11px] text-slate-500">Classification distribution across records</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.accessDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recently Added Documents & Recent Briefs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recently Added Records (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-sm">Recently Preserved Records</h3>
                <p className="text-[11px] text-slate-500">Latest records indexed into StoryVault</p>
              </div>
              <Link to="/search" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {(data?.recentDocuments || []).map((doc: any) => (
                <div key={doc.id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="font-serif font-bold text-slate-900 text-sm hover:text-brand-600 transition line-clamp-1"
                    >
                      {doc.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{doc.author?.name || 'Staff'}</span>
                      <span>•</span>
                      <span>{doc.publication?.name || 'Archive'}</span>
                      <span>•</span>
                      <span className="font-mono">{doc.publicationDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DocTypeBadge type={doc.documentType} />
                    <AccessBadge level={doc.accessLevel} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Research Briefs (1 col) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-sm">Recent Research Briefs</h3>
                <p className="text-[11px] text-slate-500">Synthesized investigative reports</p>
              </div>
              <Link to="/briefs" className="text-xs font-semibold text-brand-600 hover:underline">
                All
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {briefs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No briefs created yet.
                  <Link to="/briefs" className="block text-brand-600 mt-2 font-medium">
                    + Generate your first brief
                  </Link>
                </div>
              ) : (
                briefs.slice(0, 4).map((b) => (
                  <Link
                    key={b.id}
                    to={`/briefs/${b.id}`}
                    className="block p-3 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-slate-50 transition group"
                  >
                    <h4 className="font-serif font-bold text-xs text-slate-900 group-hover:text-brand-600 line-clamp-2">
                      {b.title}
                    </h4>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{b.createdBy?.name || 'Journalist'}</span>
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                        {b.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <Link
                to="/briefs"
                className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold py-2 rounded-lg shadow-sm transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-brand-600" />
                Build Structured Brief
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
