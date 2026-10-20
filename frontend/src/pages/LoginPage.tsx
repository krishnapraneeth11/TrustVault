/**
 * TrustVault Login Page.
 *
 * Design: Carbon Black background, Electric Mint accents, consistent with the
 * established TrustVault design system.
 *
 * Security rules:
 * - No passwords are stored in component state beyond the controlled input.
 * - Passwords are sent to the backend immediately on submit and not retained.
 * - Error messages come from the backend and are generic (no username disclosure).
 * - No auto-fill suppression that would break password managers.
 */

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TrustVaultLogo from '../components/TrustVaultLogo';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, loading, error, login, clearError } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);

  // If already authenticated, redirect to dashboard.
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // Focus the username field on mount.
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
    } finally {
      setSubmitting(false);
      // Clear password from state after submit — it has been sent.
      setPassword('');
    }
  }

  const isBusy = submitting || loading;

  return (
    <div className="min-h-screen bg-tv-carbon flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* ── Brand mark ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-8">
          <TrustVaultLogo size={56} color="mint" aria-label="TrustVault" />
          <h1 className="text-xl font-semibold text-tv-text mt-4 tracking-tight">
            TrustVault
          </h1>
          <p className="text-sm text-tv-muted mt-1">
            Secure Documents. Verified Access.
          </p>
        </div>

        {/* ── Login card ──────────────────────────────────────────────── */}
        <div className="card">
          <h2 className="text-base font-semibold text-tv-text mb-5">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">

              {/* Username */}
              <div>
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  ref={usernameRef}
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isBusy}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="your-username"
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isBusy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>

              {/* Error message */}
              {error && (
                <div
                  id="login-error"
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-tv-error/10 border border-tv-error/30 px-3 py-2.5"
                >
                  <svg
                    className="w-4 h-4 text-tv-error shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-sm text-tv-error">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isBusy || !username.trim() || !password}
                className="btn-primary w-full mt-1"
                aria-busy={isBusy}
              >
                {isBusy ? 'Signing in…' : 'Sign in'}
              </button>

            </div>
          </form>
        </div>

        {/* ── Footer note ─────────────────────────────────────────────── */}
        <p className="text-center text-xs text-tv-muted mt-6">
          Access is granted by your organisation administrator.
        </p>

      </div>
    </div>
  );
}
