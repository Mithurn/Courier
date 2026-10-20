import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { DashboardLayout } from './components/DashboardLayout';
import { EmailListPage } from './pages/EmailListPage';
import { ComposePage } from './pages/ComposePage';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { LoginPage } from './components/LoginPage';
import { DemoBanner } from './demo/DemoBanner';
import { DemoEntry } from './demo/DemoEntry';
import { Landing } from './landing/Landing';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoBanner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<DemoEntry />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<EmailListPage tab="scheduled" />} />
              <Route path="sent" element={<EmailListPage tab="sent" />} />
            </Route>
            <Route path="/compose" element={<ComposePage />} />
            <Route path="/email/:id" element={<EmailDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
