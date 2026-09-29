import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth() {
  const { user } = useAuth();

  if (user === undefined) return <p className="p-10 text-center text-muted">Loading…</p>;
  if (user === null) return <Navigate to="/login" replace />;
  return <Outlet />;
}
