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
    {
      label: 'Dashboard',
      path: '/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12L12 3l9 9M5 10v10h6m0 0v-6h2m-2 6h2m-2 0l1.5-6m-1.5 6l-1.5-6m1.5 6V10" />
        </svg>
      ),
    },
    {
      label: 'My Documents',
      path: '/documents',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14c.631 0 1.166-.489 1.45-1.125M19.5 14l-2.25-1.5v-3.5a2.25 2.25 0 00-2.25-2.25h-1.5a2.25 2.25 0 00-2.25 2.25v3.5l-2.25 1.5m6-3.5l-2.25 1.5v3.5a2.25 2.25 0 01-2.25 2.25h-6a2.25 225 0 01-2.25-2.25v-3.5l2.25-1.5m6 5.25v1.5m-3 3h6m-3 0v-1.5" />
        </svg>
      ),
    },
    {
      label: 'Access Management',
      path: '/access-management',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10v10.59m7.59-5.59l-7.59 7.59-7.59-7.59h15.18z" />
        </svg>
      ),
    },
    ...(user?.role === 'ADMIN'
      ? [{
          label: 'Employee Management',
          path: '/employees',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v6a2 2 0 01-2 2h-4a2 2 0 01-2-2V9a2 2 0 114 0v4m0 0v2m0-2h-.01M12 15v2m-6-2v2a2 2 0 01-2 2h0a2 2 0 01-2-2v-4m14-6h-.01m0 0a2 2 0 110 4 2 2 0 010-4m0 0V7a2 2 0 10-4 0v1.5M9 14.5l.01-.015M15 7h.01M15 7a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        }]
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