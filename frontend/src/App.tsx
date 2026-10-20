/**
 * App.tsx — TrustVault root component.
 *
 * Provides:
 * - React Router v7 browser routing
 * - AuthProvider context (loads current user, provides login/logout)
 * - Route definitions:
 *     /login  → LoginPage (public)
 *     /       → DashboardPage (protected — redirects to /login if unauthenticated)
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all → redirect to dashboard (ProtectedRoute handles auth check) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
