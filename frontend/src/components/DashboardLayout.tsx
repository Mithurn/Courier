import { useEffect, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Counts } from '../types';
import { Toast } from './ui';
import { Sidebar } from './Sidebar';
import { MenuIcon } from './icons';

export type DashboardOutletContext = {
  counts: Counts;
  setCounts: (counts: Counts) => void;
};

export function DashboardLayout() {
  const { user, senders } = useAuth();
  const [counts, setCounts] = useState<Counts>({ scheduled: 0, sent: 0 });
  const [slack, setSlack] = useState<{ connected: boolean; teamName: string | null }>({ connected: false, teamName: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const notice = searchParams.get('slack') === 'connected' ? 'Slack connected.' : '';

  useEffect(() => {
    api.slackStatus().then(setSlack).catch(() => undefined);
  }, []);

  async function disconnectSlack() {
    await api.slackDisconnect();
    setSlack({ connected: false, teamName: null });
  }

  function dismissNotice() {
    setSearchParams((params) => {
      params.delete('slack');
      return params;
    });
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-white text-ink">
      <Sidebar
        user={user}
        counts={counts}
        senderReady={senders.length > 0}
        slack={slack}
        open={sidebarOpen}
        onDisconnectSlack={disconnectSlack}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="rounded-full p-1.5 text-ink hover:bg-surface">
            <MenuIcon />
          </button>
        </div>

        <Outlet context={{ counts, setCounts } satisfies DashboardOutletContext} />
      </main>

      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
    </div>
  );
}
