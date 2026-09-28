import { useEffect, useState } from 'react';
import { api } from './api';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import type { User } from './types';

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  async function logout() {
    await api.logout();
    setUser(null);
    window.history.replaceState({}, '', '/login');
  }

  if (user === undefined) return <p className="p-10 text-center text-gray-500">Loading…</p>;
  if (user === null) return <LoginPage />;
  return <Dashboard user={user} onLogout={logout} />;
}
