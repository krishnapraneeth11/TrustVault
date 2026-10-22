import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import AccessManagementPage from './pages/AccessManagementPage';
import PasswordChangePage from './pages/PasswordChangePage';
import ProfilePage from './pages/ProfilePage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowTemporaryPassword>
                <PasswordChangePage />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route
              path="/access-management"
              element={<AccessManagementPage />}
            />

            <Route path="/profile" element={<ProfilePage />} />

            <Route
              path="/employees"
              element={
                <AdminOnlyRoute>
                  <EmployeeManagementPage />
                </AdminOnlyRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}