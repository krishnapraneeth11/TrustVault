/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 *
 * Usage:
 *   <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
 *
 * While the session is loading, renders a full-screen spinner.
 * Once loading is complete, either renders children (authenticated)
 * or redirects to /login (unauthenticated).
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TrustVaultLogo from './TrustVaultLogo';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-tv-carbon flex items-center justify-center" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <TrustVaultLogo size={48} color="mint" aria-label="TrustVault" />
          <p className="text-tv-muted text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
