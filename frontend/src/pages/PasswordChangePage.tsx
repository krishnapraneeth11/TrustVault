import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import TrustVaultLogo from '../components/TrustVaultLogo';

export default function PasswordChangePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current password.');
      return;
    }

    setSubmitting(true);

    try {

      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      const updatedUser = await authApi.me();
      updateUser(updatedUser);

      if (updatedUser.must_change_password) {
        setError('Your password change was not confirmed. Please try again.');
        return;
      }

      setSuccess('Password changed successfully. Redirecting to your workspace...');

      window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to change your password. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="tv-auth-page">
      <section className="tv-auth-card">
        <div className="tv-auth-brand">
          <TrustVaultLogo />
        </div>

        <div className="tv-auth-heading">
          <h1>Secure your account</h1>
          <p>
            {user?.must_change_password
              ? 'Your administrator created a temporary password. Set a new password to continue.'
              : 'Update your account password.'}
          </p>
        </div>

        {user?.must_change_password && (
          <div className="tv-alert tv-alert-warning" role="alert">
            You must change your temporary password before accessing TrustVault.
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="tv-auth-form">
          <div className="tv-form-group">
            <label htmlFor="current-password" className="form-label">
              Current password
            </label>

            <input
              id="current-password"
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="tv-form-group">
            <label htmlFor="new-password" className="form-label">
              New password
            </label>

            <input
              id="new-password"
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              disabled={submitting}
            />

            <p className="tv-field-hint">
              Use at least 8 characters and avoid common passwords.
            </p>
          </div>

          <div className="tv-form-group">
            <label htmlFor="confirm-password" className="form-label">
              Confirm new password
            </label>

            <input
              id="confirm-password"
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn-primary tv-auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Updating password...' : 'Change password'}
          </button>
        </form>

        <p className="tv-password-note">
          Your password is securely processed by the TrustVault backend.
        </p>
      </section>
    </main>
  );
}