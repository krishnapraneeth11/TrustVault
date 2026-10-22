import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import TrustVaultLogo from './TrustVaultLogo';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
      setSigningOut(false);
    }
  }

  const navigationItems = [
    { label: 'Dashboard', path: '/', icon: '▦' },
    { label: 'My Documents', path: '/documents', icon: '▤' },
    { label: 'Access Management', path: '/access-management', icon: '♧' },
    ...(user?.role === 'ADMIN'
      ? [{ label: 'Employee Management', path: '/employees', icon: '♙' }]
      : []),
  ];

  const avatarLetter = (
    user?.first_name?.charAt(0) ||
    user?.username?.charAt(0) ||
    'U'
  ).toUpperCase();

  return (
    <div className="tv-app-shell">
      <aside className="tv-sidebar">
        <div className="tv-sidebar-brand">
          <NavLink to="/" className="tv-brand-link" aria-label="TrustVault home">
            <TrustVaultLogo size={34} color="mint" />

            <span className="tv-brand-copy">
              <span className="tv-brand-name">TrustVault</span>
              <span className="tv-brand-subtitle">Secure workspace</span>
            </span>
          </NavLink>
        </div>

        <nav className="tv-sidebar-navigation" aria-label="Workspace navigation">
          <p className="tv-sidebar-heading">WORKSPACE</p>

          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `tv-sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span className="tv-sidebar-icon" aria-hidden="true">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="tv-sidebar-footer">
          <div className="tv-security-note">
            <span className="tv-security-title">Security first</span>

            <p>
              Access is checked by the server for every protected document
              operation.
            </p>
          </div>
        </div>
      </aside>

      <div className="tv-main-shell">
        <header className="tv-topbar">
          <div className="tv-topbar-context">
            <span className="tv-topbar-eyebrow">
              SECURE DOCUMENT WORKSPACE
            </span>

            <span className="tv-topbar-description">
              Manage your documents and access
            </span>
          </div>

          <div className="tv-topbar-account">
            <button
              type="button"
              className="tv-account-profile-button"
              onClick={() => navigate('/profile')}
              aria-label="Open your profile"
              title="My profile"
            >
              <span className="tv-account-copy">
                <span className="tv-account-name">
                  {user?.username ?? 'User'}
                </span>

                <span className="tv-account-role">
                  {user?.role ?? 'Member'}
                </span>
              </span>

              <span className="tv-account-avatar" aria-hidden="true">
                {avatarLetter}
              </span>
            </button>

            <button
              type="button"
              className="btn-secondary tv-signout-button"
              onClick={() => void handleLogout()}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>

        <main className="tv-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}