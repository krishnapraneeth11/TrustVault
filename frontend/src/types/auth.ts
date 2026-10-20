/**
 * TrustVault API type definitions.
 *
 * These interfaces mirror the backend serialiser output exactly.
 * Never store passwords, tokens, or session IDs here.
 */

/** TrustVault platform roles — must match backend User.Role choices. */
export type UserRole = 'ADMIN' | 'OWNER' | 'VIEWER';

/** Safe representation of the authenticated user (mirrors UserSerializer). */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string;
  date_joined: string;
}

/** Login request body. */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** Auth context state. */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
