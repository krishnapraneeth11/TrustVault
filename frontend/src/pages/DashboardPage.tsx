/**
 * TrustVault Dashboard Page.
 *
 * Minimal authenticated landing page. Shows the current user and their role.
 * No fake data, no fake action buttons.
 *
 * Document management, shared documents, and audit logs will be added in
 * later tasks. This page is intentionally minimal.
 */

import { useNavigate } from 'react-router-dom';
import TrustVaultLogo from '../components/TrustVaultLogo';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/auth';

// ── Role badge helpers ─────────────────────────────────────────────────────────

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  ADMIN: 'badge badge-warning',
  OWNER: 'badge badge-success',
  VIEWER: 'badge badge-neutral',
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  ADMIN: 'Full platform access — user management and audit logs.',
  OWNER: 'Can upload documents and manage access grants.',
  VIEWER: 'Read-only access to documents shared with you.',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!user) return null; // ProtectedRoute guarantees user is set

  const badgeClass = ROLE_BADGE_CLASS[user.role] ?? 'badge badge-neutral';
  const roleDesc = ROLE_DESCRIPTION[user.role] ?? '';

  return (
    <div className="min-h-screen bg-tv-carbon text-tv-text font-sans">

      {/* ── Top navigation ──────────────────────────────────────────────── */}
      <header className="border-b border-tv-border bg-tv-charcoal">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <TrustVaultLogo size={26} color="mint" aria-label="TrustVault" />
          <span className="text-sm font-semibold text-tv-text tracking-tight">
            TrustVault
          </span>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-tv-muted hidden sm:block">
              {user.email || user.username}
            </span>
            <span className={badgeClass}>{user.role_display}</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="btn-secondary text-xs py-1 px-3"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Welcome */}
        <section className="mb-8" aria-labelledby="welcome-heading">
          <h1 id="welcome-heading" className="text-2xl font-semibold text-tv-text mb-1">
            Welcome{user.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p className="text-tv-muted text-sm">{roleDesc}</p>
        </section>

        {/* User info card */}
        <section className="mb-8" aria-labelledby="user-info-heading">
          <p className="section-title mb-3" id="user-info-heading">Your account</p>
          <div className="card max-w-md">
            <dl className="space-y-3">
              <div className="flex justify-between items-center">
                <dt className="text-sm text-tv-muted">Username</dt>
                <dd className="text-sm text-tv-text font-mono">{user.username}</dd>
              </div>
              <div className="divider" />
              <div className="flex justify-between items-center">
                <dt className="text-sm text-tv-muted">Email</dt>
                <dd className="text-sm text-tv-text">{user.email || '—'}</dd>
              </div>
              <div className="divider" />
              <div className="flex justify-between items-center">
                <dt className="text-sm text-tv-muted">Role</dt>
                <dd><span className={badgeClass}>{user.role_display}</span></dd>
              </div>
              <div className="divider" />
              <div className="flex justify-between items-center">
                <dt className="text-sm text-tv-muted">Member since</dt>
                <dd className="text-sm text-tv-text">
                  {new Date(user.date_joined).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Future sections placeholder */}
        <section aria-labelledby="status-heading">
          <p className="section-title mb-3" id="status-heading">Platform features</p>
          <div className="card max-w-2xl">
            <p className="text-sm text-tv-muted mb-4">
              The following features will be available in upcoming releases.
            </p>
            {([
              ['My Documents', 'Coming in Task 3'],
              ['Shared With Me', 'Coming in Task 3'],
              ['Access Management', 'Coming in Task 4'],
              ['Audit Logs', 'Coming in Task 5'],
              ...(user.role === 'ADMIN' ? [['Admin Dashboard', 'Coming in Task 6'] as [string, string]] : []),
            ] as [string, string][]).map(([feature, status]) => (
              <div
                key={feature}
                className="flex justify-between items-center py-2 border-b border-tv-border last:border-0"
              >
                <span className="text-sm text-tv-text">{feature}</span>
                <span className="badge badge-neutral">{status}</span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-tv-border mt-16">
        <div className="max-w-5xl mx-auto px-6 h-12 flex items-center">
          <p className="text-xs text-tv-muted">
            TrustVault · Authentication Task 2
          </p>
        </div>
      </footer>

    </div>
  );
}
