import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { documentsApi } from '../api/client';
import type { DocumentItem } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoadingDocuments(true);
    setError('');

    try {
      const result = await documentsApi.list();
      setDocuments(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load your documents.',
      );
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);



  if (!user) return null;

  const ownedDocuments = documents.filter(
    (item) => item.owner_username === user.username,
  );

  const sharedDocuments = documents.filter(
    (item) => item.owner_username !== user.username,
  );

  const recentDocuments = [...documents]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="min-w-0">
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      {/* Welcome section */}
      <section className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-tv-mint">
          YOUR WORKSPACE
        </p>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Welcome back
              {user.first_name ? `, ${user.first_name}` : ''}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-tv-muted">
              Your documents, your permissions, and your
              workspace—all in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="btn-primary px-5 py-3 text-sm"
          >
            + Open documents
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tv-danger p-4 text-sm"
        >
          <span>{error}</span>

          <button
            type="button"
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => void loadDocuments()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section
        aria-label="Document statistics"
        className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <article className="tv-dashboard-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-tv-muted">
                Accessible documents
              </p>

              <p className="mt-3 text-3xl font-semibold">
                {loadingDocuments ? '—' : documents.length}
              </p>

              <p className="mt-2 text-xs text-tv-muted">
                Documents available to your account
              </p>
            </div>

            <span className="tv-dashboard-stat-icon text-xl">
              ▤
            </span>
          </div>
        </article>

        <article className="tv-dashboard-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-tv-muted">
                Documents you own
              </p>

              <p className="mt-3 text-3xl font-semibold">
                {loadingDocuments ? '—' : ownedDocuments.length}
              </p>

              <p className="mt-2 text-xs text-tv-muted">
                Documents owned by your account
              </p>
            </div>

            <span className="tv-dashboard-stat-icon text-xl">
              ◈
            </span>
          </div>
        </article>

        <article className="tv-dashboard-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-tv-muted">
                Shared with you
              </p>

              <p className="mt-3 text-3xl font-semibold">
                {loadingDocuments ? '—' : sharedDocuments.length}
              </p>

              <p className="mt-2 text-xs text-tv-muted">
                Documents owned by other users
              </p>
            </div>

            <span className="tv-dashboard-stat-icon text-xl">
              ⇄
            </span>
          </div>
        </article>
      </section>

      {/* Recent documents */}
      <section className="tv-dashboard-panel mb-8 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              Recent documents
            </h3>
            <p className="mt-1 text-sm text-tv-muted">
              Recently updated or created documents you can access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="btn-secondary px-4 py-2 text-xs"
          >
            View all
          </button>
        </div>

        {loadingDocuments ? (
          <div
            className="flex min-h-36 flex-col items-center justify-center gap-3"
            role="status"
          >
            <div
              className="newtons-cradle"
              aria-hidden="true"
            >
              <div className="newtons-cradle__dot" />
              <div className="newtons-cradle__dot" />
              <div className="newtons-cradle__dot" />
              <div className="newtons-cradle__dot" />
            </div>

            <p className="text-sm text-tv-muted">
              Loading your documents...
            </p>
          </div>
        ) : recentDocuments.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-3xl text-tv-mint">
              ▤
            </div>

            <p className="font-medium">
              No documents yet
            </p>

            <p className="mt-2 text-sm text-tv-muted">
              Upload a document or wait for someone to share one
              with you.
            </p>

            {(user.role === 'OWNER' || user.role === 'ADMIN') && (
              <button
                type="button"
                onClick={() => navigate('/documents')}
                className="btn-primary mt-5 px-5 py-2"
              >
                Go to documents
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-tv-border text-tv-muted">
                  <th className="py-3 pr-4 font-medium">
                    Document
                  </th>
                  <th className="py-3 pr-4 font-medium">
                    Category
                  </th>
                  <th className="py-3 pr-4 font-medium">
                    Owner
                  </th>
                  <th className="py-3 pr-4 font-medium">
                    Size
                  </th>
                  <th className="py-3 pr-4 font-medium">
                    Updated
                  </th>
                  <th className="py-3 font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentDocuments.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-tv-border last:border-0 transition-colors hover:bg-tv-panel/60"
                  >
                    <td className="py-4 pr-4">
                      <p className="font-medium">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-tv-muted">
                        {item.original_filename}
                      </p>
                    </td>

                    <td className="py-4 pr-4">
                      <span className="badge badge-neutral">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-4 pr-4">
                      {item.owner_username}
                    </td>

                    <td className="py-4 pr-4 text-tv-muted">
                      {formatFileSize(item.file_size)}
                    </td>

                    <td className="py-4 pr-4 text-tv-muted">
                      {formatDate(
                        item.updated_at || item.created_at,
                      )}
                    </td>

                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => navigate('/documents')}
                        className="btn-secondary whitespace-nowrap px-3 py-2 text-xs"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions-heading">
        <h3
          id="quick-actions-heading"
          className="mb-4 text-lg font-semibold"
        >
          Quick actions
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="tv-dashboard-action group p-5 text-left"
          >
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-tv-border bg-tv-panel text-xl text-tv-mint transition-transform group-hover:scale-105">
              ↑
            </span>

            <span className="block font-semibold">
              Documents
            </span>

            <span className="mt-2 block text-sm text-tv-muted">
              Browse, upload, download, and manage your accessible
              documents.
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/access-management')}
            className="tv-dashboard-action group rounded-xl border border-tv-border bg-tv-charcoal p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-tv-mint"
          >
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-tv-border bg-tv-panel text-xl text-tv-mint transition-transform group-hover:scale-105">
              ♧
            </span>

            <span className="block font-semibold">
              Access management
            </span>

            <span className="mt-2 block text-sm text-tv-muted">
              Grant, review, and revoke document permissions where
              authorized.
            </span>
          </button>
        </div>
      </section>

      <footer className="mt-12 border-t border-tv-border pt-5">
        <p className="text-xs leading-5 text-tv-muted">
          TrustVault · Secure document access · Access is enforced
          by the backend.
        </p>
      </footer>
      </main>
    </div>
  );
}