/**
 * TrustVault Authentication Context.
 *
 * Provides the current user, login/logout actions, and loading/error state
 * to the entire React component tree.
 *
 * Security rules:
 * - No passwords, tokens, or session IDs are stored in state or localStorage.
 * - The current user is loaded from the backend on mount; if the session
 *   has expired, the backend returns 403 and user is set to null.
 * - On logout, the session is destroyed server-side AND the in-memory user
 *   state is cleared.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authApi, ApiError, clearCsrfToken } from '../api/client';
import type { User, LoginCredentials } from '../types/auth';

// ── Context shape ──────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);  // true on mount
  const [error, setError] = useState<string | null>(null);

  /** Load the current session user from the backend on mount. */
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const me = await authApi.me();
        if (!cancelled) setUser(me);
      } catch (err) {
        // 403 means not authenticated — that's the normal unauthenticated state.
        if (err instanceof ApiError && err.status === 403) {
          if (!cancelled) setUser(null);
        } else {
          // Network error or unexpected server error — still show the app.
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUser();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null);
    setLoading(true);
    try {
      // Ensure a fresh CSRF token is available before the POST.
      await authApi.csrf();
      const loggedInUser = await authApi.login(credentials);
      setUser(loggedInUser);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Even if the server request fails, clear the local state.
    } finally {
      setUser(null);
      clearCsrfToken();
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/** Returns the auth context. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
