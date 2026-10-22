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
                  {uploading ? 'Uploadingâ€¦' : 'Upload document'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="tv-dashboard-panel rounded-2xl p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <input
              className="input md:col-span-2 transition focus:border-tv-mint focus:ring-2 focus:ring-tv-mint/15"
              placeholder="Search by title, filename or ownerâ€¦"
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
              Loading documentsâ€¦
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
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1.5 text-xs"
                            disabled={activeAction === item.id}
                            onClick={() => void handleDownload(item)}
                          >
                            Download
                          </button>
                          {(
                            item.current_user_access === 'OWNER' ||
                            item.current_user_access === 'EDIT'
                          ) && (
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1.5 text-xs"
                              disabled={activeAction === item.id || savingEdit}
                              onClick={() => startEditing(item)}
                            >
                              Edit
                            </button>
                          )}


                          {item.owner_username === user?.username && (
                            <button
                              type="button"
                              className="deleteButton"
                              aria-label={`Delete ${item.title}`}
                              title={`Delete ${item.title}`}
                              disabled={activeAction === item.id}
                              onClick={() => void handleDelete(item)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 50 59"
                                className="bin"
                                aria-hidden="true"
                              >
                                <path
                                  fill="#B5BAC1"
                                  d="M0 7.5C0 5.01472 2.01472 3 4.5 3H45.5C47.9853 3 50 5.01472 50 7.5V7.5C50 8.32843 49.3284 9 48.5 9H1.5C0.671571 9 0 8.32843 0 7.5V7.5Z"
                                />
                                <path
                                  fill="#B5BAC1"
                                  d="M17 3C17 1.34315 18.3431 0 20 0H29.3125C30.9694 0 32.3125 1.34315 32.3125 3V3H17V3Z"
                                />
                                <path
                                  fill="#B5BAC1"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M2.18565 18.0974C2.08466 15.821 3.903 13.9202 6.18172 13.9202H43.8189C46.0976 13.9202 47.916 15.821 47.815 18.0975L46.1699 55.1775C46.0751 57.3155 44.314 59.0002 42.1739 59.0002H7.8268C5.68661 59.0002 3.92559 57.3155 3.83073 55.1775L2.18565 18.0974ZM18.0003 49.5402C16.6196 49.5402 15.5003 48.4209 15.5003 47.0402V24.9602C15.5003 23.5795 16.6196 22.4602 18.0003 22.4602C19.381 22.4602 20.5003 23.5795 20.5003 24.9602V47.0402C20.5003 48.4209 19.381 49.5402 18.0003 49.5402ZM29.5003 47.0402C29.5003 48.4209 30.6196 49.5402 32.0003 49.5402C33.381 49.5402 34.5003 48.4209 34.5003 47.0402V24.9602C34.5003 23.5795 33.381 22.4602 32.0003 22.4602C30.6196 22.4602 29.5003 23.5795 29.5003 24.9602V47.0402Z"
                                />
                                <path
                                  fill="#B5BAC1"
                                  d="M2 13H48L47.6742 21.28H2.32031L2 13Z"
                                />
                              </svg>

                              <span className="tooltip">Delete</span>
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