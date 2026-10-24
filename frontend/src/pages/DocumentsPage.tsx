import { useCallback, useEffect, useState } from 'react';
import { documentsApi } from '../api/client';

import type {
  DocumentCategory,
  DocumentItem,
} from '../api/client';

import { useAuth } from '../contexts/AuthContext';

const CATEGORIES: DocumentCategory[] = [
  'HR',
  'FINANCE',
  'LEGAL',
  'POLICIES',
  'GENERAL',
];

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

export default function DocumentsPage() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState<DocumentCategory>('GENERAL');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingDocument, setEditingDocument] =
    useState<DocumentItem | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] =
    useState<DocumentCategory>('GENERAL');

  const [savingEdit, setSavingEdit] = useState(false);

  const canUpload =
    user?.role === 'OWNER' ||
    user?.role === 'ADMIN';

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await documentsApi.list();
      setDocuments(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load documents.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError('Choose a file to upload.');
      return;
    }

    if (!title.trim()) {
      setError('Enter a document title.');
      return;
    }

    setUploading(true);
    setError('');
    setNotice('');

    try {
      await documentsApi.upload(file, title.trim(), category);

      setTitle('');
      setFile(null);

      const input = document.getElementById(
        'document-file',
      ) as HTMLInputElement | null;

      if (input) input.value = '';

      setNotice('Document uploaded successfully.');
      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Upload failed.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(documentItem: DocumentItem) {
    setActiveAction(documentItem.id);
    setError('');

    try {
      await documentsApi.download(
        documentItem.id,
        documentItem.original_filename,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Download failed.',
      );
    } finally {
      setActiveAction(null);
    }
  }
  function startEditing(documentItem: DocumentItem) {
    setEditingDocument(documentItem);
    setEditTitle(documentItem.title);
    setEditCategory(documentItem.category);
    setError('');
    setNotice('');
  }
  async function handleSaveEdit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingDocument || !editTitle.trim()) {
      setError('Enter a document title.');
      return;
    }

    setSavingEdit(true);
    setError('');
    setNotice('');

    try {
      await documentsApi.update(editingDocument.id, {
        title: editTitle.trim(),
        category: editCategory,
      });

      setEditingDocument(null);
      setNotice('Document updated successfully.');

      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update the document.',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(documentItem: DocumentItem) {
    const confirmed = window.confirm(
      `Delete "${documentItem.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setActiveAction(documentItem.id);
    setError('');
    setNotice('');

    try {
      await documentsApi.delete(documentItem.id);

      setDocuments((current) =>
        current.filter((item) => item.id !== documentItem.id),
      );

      setNotice('Document deleted successfully.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Delete failed.',
      );
    } finally {
      setActiveAction(null);
    }
  }



  const filteredDocuments = documents.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.original_filename.toLowerCase().includes(query) ||
      item.owner_username.toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === 'ALL' ||
      item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-w-0">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-tv-border bg-gradient-to-br from-tv-charcoal via-tv-charcoal to-tv-mint/[0.06] p-5 sm:p-7">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              My Documents
            </h1>

            <p className="text-sm text-tv-muted mt-2">
              Upload, find and manage documents you can access.
            </p>
          </div>

          <span className="badge badge-neutral rounded-full px-3 py-1">
            {documents.length} documents
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-tv-danger/50 bg-tv-danger/10 p-4 text-sm"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-tv-mint/25 bg-tv-mint/5 p-4 text-sm"
          >
            {notice}
          </div>
        )}
        {editingDocument && (
          <section className="tv-dashboard-panel mb-8 rounded-2xl p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            Edit document
          </h2>

          <form
            onSubmit={handleSaveEdit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <label className="text-sm">
              Document title

              <input
                className="input mt-2 w-full transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={255}
                required
              />
            </label>

            <label className="text-sm">
              Category

              <select
                className="input mt-2 w-full transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
                value={editCategory}
                onChange={(event) =>
                  setEditCategory(event.target.value as DocumentCategory)
                }
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="btn-primary px-5 py-2 shadow-lg shadow-tv-mint/10"
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save changes'}
              </button>

              <button
                type="button"
                className="btn-secondary px-5 py-2"
                disabled={savingEdit}
                onClick={() => setEditingDocument(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
        )}

        {canUpload && (
          <section className="tv-dashboard-panel mb-8 rounded-2xl p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
              Upload a document
            </h2>

            <form
              onSubmit={handleUpload}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <label className="text-sm">
                Document title

                <input
                  className="input mt-2 w-full transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                  required
                />
              </label>

              <label className="text-sm">
                Category

                <select
                  className="input mt-2 w-full transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as DocumentCategory)
                  }
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm md:col-span-2">
                File (PDF, DOCX, XLSX or TXT; maximum 10 MB)

                <input
                  id="document-file"
                  className="input mt-2 w-full transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
                  type="file"
                  accept=".pdf,.docx,.xlsx,.txt"
                  required
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>

              <div className="md:col-span-2">
                <button
                  className="btn-primary px-5 py-2 shadow-lg shadow-tv-mint/10"
                  type="submit"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload document'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="tv-dashboard-panel rounded-2xl p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <input
              className="input md:col-span-2 transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
              placeholder="Search by title, filename or owner…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search documents"
            />

            <select
              className="input transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="ALL">All categories</option>

              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-tv-muted py-8">
              Loading documents…
            </p>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-10 text-center">
              <h3 className="font-semibold tracking-tight">
                No documents found
              </h3>

              <p className="text-sm text-tv-muted mt-2">
                Upload a document or adjust your search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-tv-border bg-tv-charcoal/50 text-tv-muted">
                    <th className="py-3 pr-4 font-medium">Document</th>
                    <th className="py-3 pr-4 font-medium">Category</th>
                    <th className="py-3 pr-4 font-medium">Owner</th>
                    <th className="py-3 pr-4 font-medium">Size</th>
                    <th className="py-3 pr-4 font-medium">Created</th>
                    <th className="py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDocuments.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-tv-border/70 transition-colors last:border-0 hover:bg-tv-mint/[0.035]"
                    >
                      <td className="py-4 pr-4 align-middle">
                        <div className="font-medium text-tv-text">{item.title}</div>

                        <div className="text-xs text-tv-muted mt-1">
                          {item.original_filename}
                        </div>
                      </td>

                      <td className="py-4 pr-4 align-middle">{item.category}</td>

                      <td className="py-4 pr-4 align-middle">{item.owner_username}</td>

                      <td className="py-4 pr-4 align-middle">
                        {formatFileSize(item.file_size)}
                      </td>

                      <td className="py-4 pr-4 align-middle">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="tv-doc-action-btn"
                            aria-label={`Download ${item.title}`}
                            title={`Download ${item.title}`}
                            disabled={activeAction === item.id}
                            onClick={() => void handleDownload(item)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5m-5 5V3"
                              />
                            </svg>
                            <span className="tv-tooltip">Download</span>
                          </button>

                          {(
                            item.current_user_access === 'OWNER' ||
                            item.current_user_access === 'EDIT'
                          ) && (
                            <button
                              type="button"
                              className="tv-doc-action-btn"
                              aria-label={`Edit ${item.title}`}
                              title={`Edit ${item.title}`}
                              disabled={activeAction === item.id || savingEdit}
                              onClick={() => startEditing(item)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11 5.831a1 1 0 0 1 1.866-.476L17.5 8.5a1 1 0 0 1 .476 1.866l-12 6a1 1 0 0 1-1.32-.343l-2-3a1 1 0 0 1 .598-1.526l6-2a1 1 0 0 1 1.32.343z"
                                />
                              </svg>
                              <span className="tv-tooltip">Edit</span>
                            </button>
                          )}

                          {item.owner_username === user?.username && (
                            <button
                              type="button"
                              className="tv-doc-action-btn"
                              aria-label={`Delete ${item.title}`}
                              title={`Delete ${item.title}`}
                              disabled={activeAction === item.id}
                              onClick={() => void handleDelete(item)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142a2 2 0 0 1-1.783 1.73H7.65a2 2 0 0 1-1.773-1.73L5 7"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4 7h16M10 11v6m4-6v6M15 7V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3"
                                />
                              </svg>
                              <span className="tv-tooltip">Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}