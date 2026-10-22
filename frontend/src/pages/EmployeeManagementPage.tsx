import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { authApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types/auth';

type EmployeeRole = 'OWNER' | 'VIEWER';

interface EmployeeForm {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  temporary_password: string;
}

const initialForm: EmployeeForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  role: 'VIEWER',
  temporary_password: '',
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export default function EmployeeManagementPage() {
  const { user } = useAuth();

  const [employees, setEmployees] = useState<User[]>([]);
  const [form, setForm] = useState<EmployeeForm>(initialForm);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const users = await authApi.listUsers();
      setEmployees(users);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  function updateField<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleCreateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (user?.role !== 'ADMIN') {
      setError('Only administrators can create employee accounts.');
      return;
    }

    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();

    if (!username || !email || !form.temporary_password) {
      setError('Username, email, and temporary password are required.');
      return;
    }

    if (form.temporary_password.length < 8) {
      setError('The temporary password must contain at least 8 characters.');
      return;
    }

    setCreating(true);

    try {
      await authApi.createUser({
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        role: form.role,
        temporary_password: form.temporary_password,
      });

      setForm(initialForm);

      setSuccess(
        'Employee account created successfully. The employee must change their temporary password at first login.',
      );

      await loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(employee: User) {
    setError('');
    setSuccess('');

    if (user?.role !== 'ADMIN') {
      setError('Only administrators can change account status.');
      return;
    }

    if (employee.id === user.id) {
      setError('You cannot deactivate or reactivate your own account here.');
      return;
    }

    const action = employee.is_active ? 'deactivate' : 'activate';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} the account "${employee.username}"?`,
    );

    if (!confirmed) {
      return;
    }

    setUpdatingUserId(employee.id);

    try {
      await authApi.updateUserStatus(employee.id, {
        is_active: !employee.is_active,
      });

      setEmployees((previous) =>
        previous.map((item) =>
          item.id === employee.id
            ? { ...item, is_active: !employee.is_active }
            : item,
        ),
      );

      setSuccess(
        `Account "${employee.username}" has been ${action}d successfully.`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
      await loadEmployees();
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleDeleteEmployee(employee: User) {
    setError('');
    setSuccess('');

    if (user?.role !== 'ADMIN') {
      setError('Only administrators can delete employee accounts.');
      return;
    }

    if (employee.id === user.id) {
      setError('You cannot delete your own account.');
      return;
    }

    if (employee.role === 'ADMIN') {
      setError('Administrator accounts cannot be deleted through this page.');
      return;
    }

    const confirmed = window.confirm(
      `PERMANENTLY DELETE "${employee.username}"?\n\n` +
        'This action cannot be undone. Associated document permissions may be removed. ' +
        'Documents owned by this employee must be transferred before deletion.\n\n' +
        'Click OK only if you are sure.',
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(employee.id);

    try {
      const result = await authApi.deleteUser(employee.id);

      setEmployees((previous) =>
        previous.filter((item) => item.id !== employee.id),
      );

      setSuccess(result.detail);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingUserId(null);
    }
  }

  const employeeCount = employees.filter(
    (employee) => employee.role !== 'ADMIN',
  ).length;

  const activeCount = employees.filter(
    (employee) => employee.role !== 'ADMIN' && employee.is_active,
  ).length;

  const inactiveCount = employeeCount - activeCount;

  if (user?.role !== 'ADMIN') {
    return (
      <section className="tv-page">
        <div className="tv-alert tv-alert-error" role="alert">
          You do not have permission to access Employee Management.
        </div>
      </section>
    );
  }

  return (
    <section className="tv-page">
      <div className="tv-page-heading">
        <div>
          <p className="tv-eyebrow">ADMINISTRATION</p>
          <h1>Employee Management</h1>
          <p>
            Create employee accounts and manage access to the TrustVault
            workspace.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => void loadEmployees()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh employees'}
        </button>
      </div>

      <div className="tv-employee-stats">
        <article className="tv-employee-stat">
          <span className="tv-employee-stat-label">Total employees</span>
          <strong>{employeeCount}</strong>
        </article>

        <article className="tv-employee-stat">
          <span className="tv-employee-stat-label">Active accounts</span>
          <strong>{activeCount}</strong>
        </article>

        <article className="tv-employee-stat">
          <span className="tv-employee-stat-label">Inactive accounts</span>
          <strong>{inactiveCount}</strong>
        </article>
      </div>

      {error && (
        <div className="tv-alert tv-alert-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="tv-alert tv-alert-success" role="status">
          {success}
        </div>
      )}

      <div className="tv-employee-layout">
        <section className="tv-employee-form-card">
          <div className="tv-section-heading">
            <div>
              <h2>Create employee</h2>
              <p>Add an Owner or Viewer to your workspace.</p>
            </div>
          </div>

          <form onSubmit={handleCreateEmployee} className="tv-employee-form">
            <div className="tv-form-group">
              <label className="form-label" htmlFor="employee-username">
                Username *
              </label>

              <input
                id="employee-username"
                className="form-input"
                type="text"
                autoComplete="off"
                value={form.username}
                onChange={(event) =>
                  updateField('username', event.target.value)
                }
                required
                maxLength={150}
                disabled={creating}
              />
            </div>

            <div className="tv-form-group">
              <label className="form-label" htmlFor="employee-email">
                Email address *
              </label>

              <input
                id="employee-email"
                className="form-input"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                required
                disabled={creating}
              />
            </div>

            <div className="tv-employee-name-grid">
              <div className="tv-form-group">
                <label className="form-label" htmlFor="employee-first-name">
                  First name
                </label>

                <input
                  id="employee-first-name"
                  className="form-input"
                  type="text"
                  autoComplete="off"
                  value={form.first_name}
                  onChange={(event) =>
                    updateField('first_name', event.target.value)
                  }
                  disabled={creating}
                />
              </div>

              <div className="tv-form-group">
                <label className="form-label" htmlFor="employee-last-name">
                  Last name
                </label>

                <input
                  id="employee-last-name"
                  className="form-input"
                  type="text"
                  autoComplete="off"
                  value={form.last_name}
                  onChange={(event) =>
                    updateField('last_name', event.target.value)
                  }
                  disabled={creating}
                />
              </div>
            </div>

            <div className="tv-form-group">
              <label className="form-label" htmlFor="employee-role">
                Employee role *
              </label>

              <select
                id="employee-role"
                className="form-input"
                value={form.role}
                onChange={(event) =>
                  updateField('role', event.target.value as EmployeeRole)
                }
                disabled={creating}
              >
                <option value="VIEWER">
                  Viewer — Read-only access by default
                </option>
                <option value="OWNER">Owner — Document ownership</option>
              </select>

              <p className="tv-field-hint">
                Document permissions are enforced by the backend.
              </p>
            </div>

            <div className="tv-form-group">
              <label
                className="form-label"
                htmlFor="employee-temporary-password"
              >
                Temporary password *
              </label>

              <input
                id="employee-temporary-password"
                className="form-input"
                type="password"
                autoComplete="new-password"
                value={form.temporary_password}
                onChange={(event) =>
                  updateField('temporary_password', event.target.value)
                }
                required
                minLength={8}
                disabled={creating}
              />

              <p className="tv-field-hint">
                Use a temporary password that meets your backend's password
                validation rules. Never reuse your own password.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary tv-employee-submit"
              disabled={creating}
            >
              {creating ? 'Creating account…' : 'Create employee account'}
            </button>
          </form>
        </section>

        <section className="tv-employee-list-card">
          <div className="tv-section-heading">
            <div>
              <h2>Workspace accounts</h2>
              <p>Review employee roles and account status.</p>
            </div>

            <span className="tv-employee-count">
              {employees.length} users
            </span>
          </div>

          {loading ? (
            <div className="tv-employee-empty">
              Loading employee accounts…
            </div>
          ) : employees.length === 0 ? (
            <div className="tv-employee-empty">
              No user accounts were returned by the server.
            </div>
          ) : (
            <div className="tv-employee-table-wrapper">
              <table className="tv-employee-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Account action</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => {
                    const isCurrentUser = employee.id === user.id;
                    const isAdmin = employee.role === 'ADMIN';
                    const isUpdating = updatingUserId === employee.id;
                    const isDeleting = deletingUserId === employee.id;
                    const isBusy = isUpdating || isDeleting;

                    return (
                      <tr key={employee.id}>
                        <td>
                          <div className="tv-employee-identity">
                            <span className="tv-employee-avatar">
                              {(
                                employee.first_name?.charAt(0) ||
                                employee.username.charAt(0) ||
                                'U'
                              ).toUpperCase()}
                            </span>

                            <span className="tv-employee-identity-copy">
                              <strong>{employee.username}</strong>
                              <span>{employee.email}</span>

                              {(employee.first_name || employee.last_name) && (
                                <span>
                                  {[employee.first_name, employee.last_name]
                                    .filter(Boolean)
                                    .join(' ')}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`tv-role-badge tv-role-${employee.role.toLowerCase()}`}
                          >
                            {employee.role_display || employee.role}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`tv-status-badge ${
                              employee.is_active
                                ? 'tv-status-active'
                                : 'tv-status-inactive'
                            }`}
                          >
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </span>

                          {employee.must_change_password && (
                            <span className="tv-password-required-label">
                              Password change required
                            </span>
                          )}
                        </td>

                        <td>
                          {isAdmin ? (
                            <span className="tv-account-protected">
                              Administrator
                            </span>
                          ) : isCurrentUser ? (
                            <span className="tv-account-protected">
                              Your account
                            </span>
                          ) : (
                            <div className="tv-employee-actions">
                              <button
                                type="button"
                                className={
                                  employee.is_active
                                    ? 'tv-status-action tv-status-action-danger'
                                    : 'tv-status-action tv-status-action-success'
                                }
                                onClick={() =>
                                  void handleToggleStatus(employee)
                                }
                                disabled={isBusy}
                              >
                                {isUpdating
                                  ? 'Updating…'
                                  : employee.is_active
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </button>

                              <button
                                type="button"
                                className="tv-status-action tv-status-action-delete"
                                onClick={() =>
                                  void handleDeleteEmployee(employee)
                                }
                                disabled={isBusy}
                                aria-label={`Permanently delete ${employee.username}`}
                              >
                                {isDeleting ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="tv-employee-security-note">
            Account activation controls login eligibility. Deleting an account
            is permanent and may remove associated document permissions.
            Documents owned by an employee must be transferred before deletion.
          </p>
        </section>
      </div>
    </section>
  );
}