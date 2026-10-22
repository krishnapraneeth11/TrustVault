import { useCallback, useEffect, useState } from 'react';

import { documentsApi } from '../api/client';
import type {
  AccessLevel,
  DocumentItem,
  DocumentPermission,
} from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import TrustVaultLogo from '../components/TrustVaultLogo';

export default function AccessManagementPage() {
  const { user, logout } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [username, setUsername] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('READ');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedDocument = documents.find(
    (document) => document.id === selectedDocumentId,
  );

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await documentsApi.list();
      const ownedDocuments = result.filter(
        (document) => document.owner_username === user?.username,
      );

      setDocuments(ownedDocuments);

      setSelectedDocumentId((current) => {
        if (ownedDocuments.some((document) => document.id === current)) {
          return current;
        }

        return ownedDocuments[0]?.id ?? '';
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load documents.',
      );
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  const loadPermissions = useCallback(async () => {
    if (!selectedDocumentId) {
      setPermissions([]);
      return;
    }

    setError('');

    try {
      const result = await documentsApi.listPermissions(
        selectedDocumentId,
      );

      setPermissions(result);
    } catch (err) {
      setPermissions([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load permissions.',
      );
    }
  }, [selectedDocumentId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  async function handleGrant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDocumentId || !username.trim()) {
      setError('Select a document and enter a username.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await documentsApi.grantPermission(selectedDocumentId, {
        username: username.trim(),
        access_level: accessLevel,
      });

      setUsername('');
      setNotice('Permission granted successfully.');

      await loadPermissions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not grant permission.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(permission: DocumentPermission) {
    const confirmed = window.confirm(
      `Revoke ${permission.access_level} access for ${permission.username}?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await documentsApi.revokePermission(
        selectedDocumentId,
        permission.id,
      );

      setNotice(`Access revoked for ${permission.username}.`);

      await loadPermissions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not revoke permission.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Sign out failed.',
      );
    }
  }

  return (
    <div className="min-h-screen bg-tv-carbon text-tv-text font-sans">
      <header className="border-b border-tv-border bg-tv-charcoal">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <TrustVaultLogo size={28} color="mint" />
          <span className="font-semibold">TrustVault</span>

          <a
            href="/"
            className="ml-6 text-sm text-tv-muted hover:text-tv-text"
          >
            Dashboard
          </a>

          <span className="ml-auto text-sm text-tv-muted">
            {user?.username}
          </span>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="btn-secondary text-xs py-2 px-3"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold">
          Access Management
        </h1>

        <p className="text-sm text-tv-muted mt-2 mb-8">
          Manage document permissions and control who can access your files.
        </p>

        {error && (
          <div role="alert" className="card mb-5 text-tv-danger">
            {error}
          </div>
        )}

        {notice && (
          <div role="status" className="card mb-5">
            {notice}
          </div>
        )}

        <section className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Select a document
          </h2>

          {loading ? (
            <p className="text-tv-muted">Loading documents…</p>
          ) : documents.length === 0 ? (
            <p className="text-tv-muted">
              You do not own any documents to manage.
            </p>
          ) : (
            <select
              className="input w-full"
              value={selectedDocumentId}
              onChange={(event) => {
                setSelectedDocumentId(event.target.value);
                setNotice('');
                setError('');
              }}
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          )}

          {selectedDocument && (
            <p className="text-xs text-tv-muted mt-3">
              File: {selectedDocument.original_filename}
            </p>
          )}
        </section>

        {selectedDocumentId && (
          <>
            <section className="card mb-6">
              <h2 className="text-lg font-semibold mb-4">
                Grant access
              </h2>

              <form
                onSubmit={(event) => void handleGrant(event)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <label className="text-sm">
                  Username

                  <input
                    className="input mt-2 w-full"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter an existing username"
                    required
                  />
                </label>

                <label className="text-sm">
                  Permission level

                  <select
                    className="input mt-2 w-full"
                    value={accessLevel}
                    onChange={(event) =>
                      setAccessLevel(event.target.value as AccessLevel)
                    }
                  >
                    <option value="READ">READ — View and download</option>
                    <option value="EDIT">EDIT — Modify document</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="btn-primary px-5 py-2 w-full"
                    disabled={saving || !selectedDocumentId}
                  >
                    {saving ? 'Processing…' : 'Grant access'}
                  </button>
                </div>
              </form>

              <p className="text-xs text-tv-muted mt-3">
                Only existing users can be granted access. The backend
                must verify the username and authorize this operation.
              </p>
            </section>

            <section className="card">
              <h2 className="text-lg font-semibold mb-4">
                Current permissions
              </h2>

              {permissions.length === 0 ? (
                <p className="text-sm text-tv-muted">
                  No explicit permissions have been granted for this document.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-tv-border text-tv-muted">
                        <th className="py-3 pr-4">Username</th>
                        <th className="py-3 pr-4">Access</th>
                        <th className="py-3 pr-4">Granted</th>
                        <th className="py-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {permissions.map((permission) => (
                        <tr
                          key={permission.id}
                          className="border-b border-tv-border last:border-0"
                        >
                          <td className="py-4 pr-4">
                            {permission.username}
                          </td>

                          <td className="py-4 pr-4">
                            <span className="badge badge-neutral">
                              {permission.access_level}
                            </span>
                          </td>

                          <td className="py-4 pr-4">
                            {new Date(
                              permission.granted_at,
                            ).toLocaleDateString()}
                          </td>

                          <td className="py-4">
                            <button
                              type="button"
                              className="btn-secondary text-xs px-3 py-2"
                              disabled={saving}
                              onClick={() =>
                                void handleRevoke(permission)
                              }
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}