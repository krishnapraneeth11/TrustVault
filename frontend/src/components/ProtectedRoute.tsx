
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TrustVaultLogo from './TrustVaultLogo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowTemporaryPassword?: boolean;
}

export default function ProtectedRoute({
  children,
  allowTemporaryPassword = false,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="tv-auth-loading">
        <div className="tv-auth-loading-card">
          <TrustVaultLogo />
          <div className="tv-spinner" />
          <p>Securing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Users who must change a temporary password can only access
  // routes explicitly allowed during the password-change process.
  if (user.must_change_password && !allowTemporaryPassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}

