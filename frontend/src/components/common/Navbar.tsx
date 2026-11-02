import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Archive,
  Search,
  Bot,
  FileText,
  Clock,
  Bookmark,
  UploadCloud,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from './Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    ...(user ? [{ to: '/dashboard', label: 'Dashboard', icon: Archive }] : []),
    { to: '/search', label: 'Universal Search', icon: Search },
    { to: '/assistant', label: 'AI Assistant', icon: Bot },
    { to: '/briefs', label: 'Briefs', icon: FileText },
    { to: '/timeline', label: 'Timeline & Graph', icon: Clock },
    { to: '/collections', label: 'Collections', icon: Bookmark },
  ];

  // Archivist & Admin access to ingestion
  if (user?.role === 'ARCHIVIST' || user?.role === 'ADMIN') {
    navLinks.push({ to: '/ingestion', label: 'Archive Ingestion', icon: UploadCloud });
  }

  // Admin only
  if (user?.role === 'ADMIN') {
    navLinks.push({ to: '/admin', label: 'Governance', icon: ShieldAlert });
  }

  return (
    <header className="sticky top-0 z-40 bg-vault-dark text-slate-100 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-vault-slate flex items-center justify-center text-white shadow-inner font-serif font-bold text-lg group-hover:scale-105 transition-transform">
                SV
              </div>
              <div>
                <span className="font-serif text-xl font-bold tracking-tight text-white group-hover:text-brand-300 transition-colors">
                  StoryVault
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] tracking-widest font-mono uppercase text-brand-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
                  Media Archive Intel
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Area */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <RoleBadge role={user.role} />
                <span className="hidden lg:inline text-xs text-slate-300 font-medium">
                  {user.name}
                </span>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto border-t border-slate-800 py-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
