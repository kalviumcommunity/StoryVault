import React from 'react';
import { AccessLevel, DocumentType, Role } from '../../types';

export const AccessBadge: React.FC<{ level: AccessLevel }> = ({ level }) => {
  const styles: Record<AccessLevel, string> = {
    PUBLIC: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INTERNAL: 'bg-blue-50 text-blue-700 border-blue-200',
    RESTRICTED: 'bg-amber-50 text-amber-700 border-amber-200',
    CLASSIFIED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[level] || styles.PUBLIC}`}
    >
      {level}
    </span>
  );
};

export const DocTypeBadge: React.FC<{ type: DocumentType | string }> = ({ type }) => {
  const label = type.replace(/_/g, ' ');
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {label}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const styles: Record<Role, string> = {
    JOURNALIST: 'bg-sky-100 text-sky-800 border-sky-300',
    EDITOR: 'bg-purple-100 text-purple-800 border-purple-300',
    ARCHIVIST: 'bg-amber-100 text-amber-800 border-amber-300',
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[role] || 'bg-slate-100 text-slate-800'}`}
    >
      {role}
    </span>
  );
};

export const VerifiedSourceBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
    Verified Archive Record
  </span>
);

export const AiSynthesisBadge: React.FC<{ mode?: string }> = ({ mode }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
    AI Synthesis {mode ? `(${mode})` : ''}
  </span>
);
