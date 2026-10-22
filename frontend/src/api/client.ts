/**
 * TrustVault API client.
 *
 * Security rules enforced here:
 * - credentials: 'include' sends the session cookie on every request.
 * - CSRF token is fetched from the backend and sent as X-CSRFToken header
 *   on all state-changing requests (POST, PUT, PATCH, DELETE).
 * - No passwords, session IDs, or tokens are stored in localStorage.
 * - The CSRF token is kept only in module-level memory; it is lost on page
 *   reload, which is acceptable — the token is re-fetched on the next login attempt.
 * - The API base URL is read from VITE_API_BASE_URL at build time, so it can
 *   be configured per environment without modifying source code.
 */

import type { LoginCredentials, User } from '../types/auth';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000/api';

/** In-memory CSRF token. Not persisted to localStorage or cookies. */
let csrfToken: string | null = null;

/** Fetch and cache the CSRF token from the backend. */
async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/csrf/`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token.');
  }
  const data = await response.json() as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

/** Ensure we have a CSRF token; fetch if missing. */
async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken();
}

/** Clear the cached CSRF token (call on logout). */
export function clearCsrfToken(): void {
  csrfToken = null;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

/** Generic fetch wrapper that handles credentials and CSRF. */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(body instanceof FormData) && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (isWriteMethod) {
    const token = await ensureCsrf();
    headers['X-CSRFToken'] = token;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',  // send session cookie
    headers,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data = await response.json() as T | { detail: string };

  if (!response.ok) {
    const detail = (data as { detail?: string }).detail ?? `HTTP ${response.status}`;
    throw new ApiError(detail, response.status);
  }

  return data as T;
}

/** Typed API error with HTTP status code. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ── Auth endpoints ─────────────────────────────────────────────────────────────

export const authApi = {
  /** Fetch and set the CSRF cookie. Call before any POST request. */
  csrf: () => fetchCsrfToken(),

  /**
   * Log in with username + password.
   * Returns the authenticated user on success.
   * Throws ApiError on failure (generic message — does not reveal username existence).
   */
  login: (credentials: LoginCredentials) =>
    request<User>('/auth/login/', { method: 'POST', body: credentials }),

  /** Destroy the current session. */
  logout: () =>
    request<{ detail: string }>('/auth/logout/', { method: 'POST' }),

  /** Return the current authenticated user, or throw 403 if not logged in. */
  me: () => request<User>('/auth/me/'),
};
// ── Document endpoints ────────────────────────────────────────────────

export type DocumentCategory =
  | 'HR'
  | 'FINANCE'
  | 'LEGAL'
  | 'POLICIES'
  | 'GENERAL';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  owner_username: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadResult {
  id: string;
  title: string;
  category: DocumentCategory;
  original_filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
}
export type AccessLevel = 'READ' | 'EDIT';

export interface DocumentPermission {
  id: number;
  user: number;
  username: string;
  access_level: AccessLevel;
  granted_at: string;
}

export interface PermissionGrantInput {
  username: string;
  access_level: AccessLevel;
}

export const documentsApi = {
  list: () => request<DocumentItem[]>('/documents/'),

  upload: async (
    file: File,
    title: string,
    category: DocumentCategory,
  ): Promise<DocumentUploadResult> => {
    const form = new FormData();

    form.append('upload', file);
    form.append('title', title);
    form.append('category', category);

    return request<DocumentUploadResult>('/documents/', {
      method: 'POST',
      body: form,
    });
  },

  get: (id: string) =>
    request<DocumentItem>(`/documents/${id}/`),

  update: (
    id: string,
    data: Partial<Pick<DocumentItem, 'title' | 'category'>>,
  ) =>
    request<DocumentItem>(`/documents/${id}/`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: string) =>
    request<void>(`/documents/${id}/`, {
      method: 'DELETE',
    }),

  download: async (id: string, filename: string): Promise<void> => {
    const response = await fetch(
      `${API_BASE}/documents/${id}/download/`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/octet-stream',
        },
      },
    );

    if (!response.ok) {
      let message = `Download failed: HTTP ${response.status}`;

      try {
        const data = await response.json() as { detail?: string };
        message = data.detail ?? message;
      } catch {
        // Keep the HTTP status message if the response isn't JSON.
      }

      throw new ApiError(message, response.status);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  },
    // List permissions for a document.
  listPermissions: (documentId: string) =>
    request<DocumentPermission[]>(
      `/documents/${documentId}/permissions/`,
    ),

  // Grant READ or EDIT access to a user.
  grantPermission: (
    documentId: string,
    data: PermissionGrantInput,
  ) =>
    request<DocumentPermission>(
      `/documents/${documentId}/permissions/`,
      {
        method: 'POST',
        body: data,
      },
    ),

  // Revoke a user's permission.
  revokePermission: (
    documentId: string,
    permissionId: number,
  ) =>
    request<void>(
      `/documents/${documentId}/permissions/${permissionId}/`,
      {
        method: 'DELETE',
      },
    ),
};
