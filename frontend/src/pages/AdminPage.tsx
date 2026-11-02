import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  Server,
  Database,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { RoleBadge } from '../components/common/Badge';
import { Role, User, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async (page = 1) => {
    setLoading(true);
    try {
      const [healthRes, usersRes, logsRes] = await Promise.all([
        api.getSystemHealth(),
        api.getUsers(),
        api.getAuditLogs(page, 15),
      ]);
      setHealth(healthRes);
      setUsers(usersRes.users || []);
      setLogs(logsRes.logs || []);
      setLogPage(logsRes.page || 1);
      setLogTotalPages(logsRes.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchAdminData(1);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await api.updateUserRole(userId, newRole);
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(`Role change failed: ${err.message}`);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-vault-light py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-rose-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-slate-900">
            Administrator Clearance Required
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Access to System Administration & Governance is restricted to the <strong>ADMIN</strong> role.
            Your current account is <strong>{user?.role || 'Guest'}</strong>.
          </p>
          <div className="pt-2 text-xs text-slate-500">
            Tip: Use the role switcher in the header to switch to <strong>ADMIN</strong>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h1 className="text-2xl font-serif font-bold text-slate-900">
                System Administration & Audit Governance
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              User role authority, PostgreSQL 18 latency, audit trail inspection, and search indexing status.
            </p>
          </div>
        </div>

        {/* System Health Status Cards */}
        {health && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-mono uppercase font-bold text-slate-700 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-brand-600" /> PostgreSQL 18 Engine
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {health.database?.latencyMs} ms
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Status: {health.database?.status} • schema: public
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-mono uppercase font-bold text-slate-700 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-purple-600" /> AI Provider Adapter
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {health.aiProvider?.configuredMode.toUpperCase()}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Grounded Deterministic Engine: Active
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-mono uppercase font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" /> Search Pipelines
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">
                HYBRID (RRF)
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                GIN Full-Text + 256d Vector Cosine
              </p>
            </div>
          </div>
        )}

        {/* User Management Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                Newsroom User Access & Role Clearance
              </h3>
              <p className="text-[11px] text-slate-500">
                Modify user roles to grant or restrict archive classification clearance
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Current Role</th>
                  <th className="py-2.5 px-3">Clearance Access</th>
                  <th className="py-2.5 px-3">Role Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{u.email}</td>
                    <td className="py-3 px-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {u.role === 'ADMIN'
                        ? 'PUBLIC, INTERNAL, RESTRICTED, CLASSIFIED'
                        : u.role === 'ARCHIVIST' || u.role === 'EDITOR'
                        ? 'PUBLIC, INTERNAL, RESTRICTED'
                        : 'PUBLIC, INTERNAL'}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="text-xs p-1 rounded border border-slate-300 bg-white"
                      >
                        <option value="JOURNALIST">JOURNALIST</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="ARCHIVIST">ARCHIVIST</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Audit Trail & Security Activity Log
              </h3>
              <p className="text-[11px] text-slate-500">
                Immutable records of user logins, role switches, document creations, and research queries
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity Type</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                      {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.entityType}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {log.user ? `${log.user.name} (${log.user.role})` : 'System'}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logTotalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                disabled={logPage <= 1}
                onClick={() => fetchAdminData(logPage - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="font-mono text-slate-500">
                Page {logPage} of {logTotalPages}
              </span>
              <button
                disabled={logPage >= logTotalPages}
                onClick={() => fetchAdminData(logPage + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
