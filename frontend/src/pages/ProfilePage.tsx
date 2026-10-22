import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { authApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email ?? '');
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        const profile = await authApi.profile();

        if (!cancelled) {
          setEmail(profile.email);
          setFirstName(profile.first_name);
          setLastName(profile.last_name);
          updateUser(profile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Unable to load your profile.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await authApi.updateProfile({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      const updatedUser = await authApi.me();
      updateUser(updatedUser);

      setEmail(updatedUser.email);
      setFirstName(updatedUser.first_name);
      setLastName(updatedUser.last_name);
      setSuccess('Your profile was updated successfully.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update your profile.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <section className="tv-page">
      <div className="tv-page-heading">
        <div>
          <p className="tv-eyebrow">ACCOUNT SETTINGS</p>
          <h1>My Profile</h1>
          <p>View and update your TrustVault account details.</p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/')}
        >
          Back to dashboard
        </button>
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

      <div className="tv-profile-card">
        <div className="tv-profile-header">
          <div className="tv-profile-avatar">
            {(firstName.charAt(0) || user.username.charAt(0) || 'U').toUpperCase()}
          </div>

          <div>
            <h2>
              {[firstName, lastName].filter(Boolean).join(' ') ||
                user.username}
            </h2>
            <p>{user.role_display || user.role}</p>
            <span className="tv-profile-username">@{user.username}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="tv-profile-form">
          <div className="tv-form-group">
            <label className="form-label" htmlFor="profile-username">
              Username
            </label>
            <input
              id="profile-username"
              className="form-input"
              value={user.username}
              disabled
              readOnly
            />
            <p className="tv-field-hint">
              Your username cannot be changed here.
            </p>
          </div>

          <div className="tv-form-group">
            <label className="form-label" htmlFor="profile-email">
              Email address
            </label>
            <input
              id="profile-email"
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading || saving}
            />
          </div>

          <div className="tv-profile-name-grid">
            <div className="tv-form-group">
              <label className="form-label" htmlFor="profile-first-name">
                First name
              </label>
              <input
                id="profile-first-name"
                className="form-input"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div className="tv-form-group">
              <label className="form-label" htmlFor="profile-last-name">
                Last name
              </label>
              <input
                id="profile-last-name"
                className="form-input"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={loading || saving}
              />
            </div>
          </div>

          <div className="tv-form-group">
            <label className="form-label" htmlFor="profile-role">
              Account role
            </label>
            <input
              id="profile-role"
              className="form-input"
              value={user.role_display || user.role}
              disabled
              readOnly
            />
            <p className="tv-field-hint">
              Only an administrator can assign account roles.
            </p>
          </div>

          <div className="tv-profile-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || saving}
            >
              {saving ? 'Saving changes…' : 'Save profile'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/change-password')}
            >
              Change password
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}