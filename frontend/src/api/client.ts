
/**
 * TrustVault API client.
 *
 * Security:
 * - Session cookies are sent using credentials: 'include'.
 * - CSRF tokens are fetched from Django and sent with state-changing requests.
 * - No passwords, session IDs, or CSRF tokens are stored in localStorage.
 * - The API base URL can be configured using VITE_API_BASE_URL.
 */

import type { LoginCredentials, User } from '../types/auth';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000/api';

/** Keep the CSRF token in memory only. */
let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/csrf/`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to establish a secure session. Please refresh and try again.');
  }

  const data = (await response.json()) as { csrfToken: string };

  csrfToken = data.csrfToken;
  return csrfToken;
}

async function ensureCsrf(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  return fetchCsrfToken();
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

/** Typed API error containing the HTTP status code. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Convert Django REST Framework validation responses into readable messages.
 *
 * Handles responses such as:
 * { "detail": "..." }
 * { "non_field_errors": ["..."] }
 * { "new_password": ["..."] }
 * { "email": ["..."] }
 * { "username": ["..."] }
 */
function getErrorMessage(data: unknown, status: number): string {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const errorData = data as Record<string, unknown>;

    // Prefer Django's general explanation when provided.
    if (typeof errorData.detail === 'string' && errorData.detail.trim()) {
      return errorData.detail;
    }

    // Collect field-level and general validation errors.
    const messages: string[] = [];

    for (const [field, value] of Object.entries(errorData)) {
      if (field === 'csrfToken') {
        continue;
      }

      const errors = Array.isArray(value) ? value : [value];

      for (const error of errors) {
        if (typeof error !== 'string' || !error.trim()) {
          continue;
        }

        let message = error.trim();

        // Make password-related errors more useful.
        if (/password is too common/i.test(message)) {
          message =
            'Your new password is too common. Please choose a stronger password that is harder to guess.';
        } else if (/password is too short/i.test(message)) {
          message =
            'Your password is too short. Please choose a longer password.';
        } else if (/password is entirely numeric/i.test(message)) {
          message =
            'Your password cannot contain only numbers. Include letters and other characters.';
        } else if (/password is too similar/i.test(message)) {
          message =
            'Your password is too similar to your personal information. Choose something less predictable.';
        } else if (/current password is incorrect/i.test(message)) {
          message =
            'Your current password is incorrect. Please check it and try again.';
        } else if (/passwords? do(?:es)? not match|passwords? must match/i.test(message)) {
          message =
            'Your new password and confirmation do not match.';
        }

        if (field === 'non_field_errors' || field === 'detail') {
          messages.push(message);
        } else {
          const readableField = field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (character) => character.toUpperCase());

          messages.push(`${readableField}: ${message}`);
        }
      }
    }

    if (messages.length > 0) {
      return [...new Set(messages)].join(' ');
    }
  }

  // Fallback for responses that don't contain readable validation details.
  switch (status) {
    case 400:
      return 'Some information is invalid. Please review your entries and try again.';
    case 401:
      return 'Authentication failed or your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource could not be found.';
    case 409:
      return 'This action conflicts with the current state. Please refresh and try again.';
    case 413:
      return 'The uploaded file is too large.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      if (status >= 500) {
        return 'The server encountered a problem. Please try again later.';
      }

      return `Request failed with HTTP ${status}.`;
  }
}

/** Common request handler for JSON and multipart API requests. */
async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body } = options;

  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  async function sendRequest(token?: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (!(body instanceof FormData) && body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (isWriteMethod && token) {
      headers['X-CSRFToken'] = token;
    }

    return fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    });
  }

  let token: string | undefined;

  if (isWriteMethod) {
    token = await ensureCsrf();
  }

  let response = await sendRequest(token);

  // Retry once only when Django explicitly identifies a CSRF failure.
  if (isWriteMethod && response.status === 403) {
    const errorText = await response.clone().text();

    const isCsrfFailure = /CSRF Failed|CSRF token/i.test(errorText);

    if (isCsrfFailure) {
      token = await fetchCsrfToken();
      response = await sendRequest(token);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  let data: unknown = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { detail: responseText };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
    );
  }

  return data as T;
}

// ============================================================
// Authentication, profile and employee management endpoints
// ============================================================

export interface ProfileUpdateInput {
  email: string;
  first_name: string;
  last_name: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export interface CreateEmployeeInput {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'OWNER' | 'VIEWER';
  temporary_password: string;
}

export interface EmployeeStatusInput {
  is_active: boolean;
}

export const authApi = {
  /** Fetch a CSRF token before submitting a state-changing request. */
  csrf: () => fetchCsrfToken(),

  /** Authenticate using username and password. */
  login: async (credentials: LoginCredentials) => {
    await fetchCsrfToken();

    return request<User>('/auth/login/', {
      method: 'POST',
      body: credentials,
    });
  },

  /** End the current server-side session. */
  logout: () =>
    request<{ detail: string }>('/auth/logout/', {
      method: 'POST',
    }),

  /** Fetch the authenticated user's information. */
  me: () => request<User>('/auth/me/'),

  /** Fetch the user's editable profile. */
  profile: () => request<User>('/auth/profile/'),

  /** Update profile fields. */
  updateProfile: (data: ProfileUpdateInput) =>
    request<User>('/auth/profile/', {
      method: 'PATCH',
      body: data,
    }),

  /** Change the authenticated user's password. */
  changePassword: async (data: ChangePasswordInput) => {
    await fetchCsrfToken();

    return request<{ detail: string }>('/auth/change-password/', {
      method: 'POST',
      body: data,
    });
  },

  /** List users. Django must restrict this endpoint to authorized admins. */
  listUsers: () => request<User[]>('/auth/users/'),

  /** Create an employee account. */
  createUser: (data: CreateEmployeeInput) =>
    request<User>('/auth/users/', {
      method: 'POST',
      body: data,
    }),

  /** Activate or deactivate an employee account. */
  updateUserStatus: (userId: number, data: EmployeeStatusInput) =>
    request<User>(`/auth/users/${userId}/status/`, {
      method: 'PATCH',
      body: data,
    }),

  /** Permanently delete an employee account. */
  deleteUser: (userId: number) =>
    request<{
      detail: string;
      deleted_user_id: number;
    }>(`/auth/users/${userId}/delete/`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Document endpoints
// ============================================================

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
  current_user_access: 'OWNER' | 'EDIT' | 'READ' | null;
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
  /** List documents accessible to the current user. */
  list: () => request<DocumentItem[]>('/documents/'),

  /** Upload a document. */
  upload: (
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

  /** Retrieve document metadata. */
  get: (id: string) =>
    request<DocumentItem>(`/documents/${id}/`),

  /** Update editable document metadata. */
  update: (
    id: string,
    data: Partial<Pick<DocumentItem, 'title' | 'category'>>,
  ) =>
    request<DocumentItem>(`/documents/${id}/`, {
      method: 'PATCH',
      body: data,
    }),

  /** Delete a document. */
  delete: (id: string) =>
    request<void>(`/documents/${id}/`, {
      method: 'DELETE',
    }),

  /** Download a document using the authenticated session. */
  download: async (id: string, filename: string): Promise<void> => {
    const response = await fetch(
      `${API_BASE}/documents/${id}/download/`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/octet-stream',
        },
      },
    );

    if (!response.ok) {
      let message = `Download failed: HTTP ${response.status}`;

      try {
        const data = (await response.json()) as {
          detail?: string;
          [key: string]: unknown;
        };

        message = getErrorMessage(data, response.status);
      } catch {
        // Keep the HTTP status message.
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
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    }
  },

  /** List permissions associated with a document. */
  listPermissions: (documentId: string) =>
    request<DocumentPermission[]>(
      `/documents/${documentId}/permissions/`,
    ),

  /** Grant READ or EDIT access. */
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

  /** Revoke a document permission. */
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

