/**
 * TrustVault API type definitions.
 * These interfaces mirror the backend serializer output.
 */

export type UserRole = 'ADMIN' | 'OWNER' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string;
  date_joined: string;
  must_change_password: boolean;
  is_active: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}