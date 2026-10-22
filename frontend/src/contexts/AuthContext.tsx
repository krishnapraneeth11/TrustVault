/**
 * TrustVault Authentication Context.
 *
 * Provides the authenticated user, login/logout actions,
 * profile state updates, and authentication status.
 *
 * Security:
 * - No passwords, session IDs or tokens are stored in localStorage.
 * - Django remains responsible for authentication and authorization.
 * - The session cookie is managed by the browser and backend.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  authApi,
  ApiError,
  clearCsrfToken,
} from '../api/client';

import type {
  User,
  LoginCredentials,
} from '../types/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;

  clearError: () => void;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the authenticated user from Django.
   */
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const currentUser = await authApi.me();

      setUser(currentUser);

      return currentUser;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setUser(null);
        return null;
      }

      throw err;
    }
  }, []);

  /**
   * Load the current session when the application starts.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const currentUser = await authApi.me();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Log in through the Django session endpoint.
   */
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setError(null);
      setLoading(true);

      try {
        await authApi.csrf();

        const authenticatedUser = await authApi.login(credentials);

        setUser(authenticatedUser);
      } catch (err) {
        setUser(null);

        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred. Please try again.');
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Log out and clear local authentication state.
   */
  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      await authApi.logout();
    } catch {
      // Clear local state even if the logout request fails.
    } finally {
      setUser(null);
      clearCsrfToken();
      setError(null);
      setLoading(false);
    }
  }, []);

  /**
   * Update the user stored in React context after a successful
   * profile update or password change.
   */
  const updateUser = useCallback((updatedUser: User): void => {
    setUser(updatedUser);
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        clearError,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access authentication state inside components.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider.',
    );
  }

  return context;
}