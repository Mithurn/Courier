import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { DashboardLayout } from './components/DashboardLayout';
import { EmailListPage } from './pages/EmailListPage';
import { ComposePage } from './pages/ComposePage';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { LoginPage } from './components/LoginPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<EmailListPage tab="scheduled" />} />
              <Route path="sent" element={<EmailListPage tab="sent" />} />
            </Route>
            <Route path="/compose" element={<ComposePage />} />
            <Route path="/email/:id" element={<EmailDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
