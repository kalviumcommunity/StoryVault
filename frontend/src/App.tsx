import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SearchPage } from './pages/SearchPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { AssistantPage } from './pages/AssistantPage';
import { BriefBuilderPage } from './pages/BriefBuilderPage';
import { BriefDetailPage } from './pages/BriefDetailPage';
import { TimelinePage } from './pages/TimelinePage';
import { CollectionsPage } from './pages/CollectionsPage';
import { IngestionPage } from './pages/IngestionPage';
import { AdminPage } from './pages/AdminPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-vault-light flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-vault-light flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />

            {/* Publicly browsable with role-aware clearance */}
            <Route path="/search" element={<SearchPage />} />
            <Route path="/documents/:id" element={<DocumentDetailPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/timeline" element={<TimelinePage />} />

            {/* Protected Workspace routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/briefs"
              element={<BriefBuilderPage />}
            />
            <Route
              path="/briefs/:id"
              element={<BriefDetailPage />}
            />
            <Route
              path="/collections"
              element={<CollectionsPage />}
            />
            <Route
              path="/ingestion"
              element={
                <ProtectedRoute>
                  <IngestionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
