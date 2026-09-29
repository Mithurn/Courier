import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { Sender, User } from '../types';

type AuthContextValue = {
  user: User | null | undefined;
  senders: Sender[];
  sendersError: string;
  retrySenders: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [sendersError, setSendersError] = useState('');
  const [sendersAttempt, setSendersAttempt] = useState(0);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    setSendersError('');
    api
      .senders()
      .then((list) => (list.length > 0 ? list : api.createSender().then((sender) => [sender])))
      .then(setSenders)
      .catch((err: Error) => setSendersError(err.message || 'Could not load senders'));
  }, [user, sendersAttempt]);

  async function logout() {
    await api.logout();
    setUser(null);
    setSenders([]);
  }

  const retrySenders = () => setSendersAttempt((n) => n + 1);

  return (
    <AuthContext.Provider value={{ user, senders, sendersError, retrySenders, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
