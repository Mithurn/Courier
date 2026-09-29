import { useCallback, useEffect, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Counts } from '../types';
import { SlackConnectPrompt } from './SlackConnectPrompt';
import { Toast } from './ui';
import { Sidebar } from './Sidebar';
import { MenuIcon } from './icons';

const slackPromptKey = (userId: string) => `slack-prompt-dismissed:${userId}`;

export type DashboardOutletContext = {
  counts: Counts;
  setCounts: (counts: Counts) => void;
};

export function DashboardLayout() {
  const { user, senders } = useAuth();
  const [counts, setCounts] = useState<Counts>({ scheduled: 0, sent: 0 });
  const [slack, setSlack] = useState<{ connected: boolean; teamName: string | null }>({ connected: false, teamName: null });
  const [slackLoaded, setSlackLoaded] = useState(false);
  const [showSlackPrompt, setShowSlackPrompt] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const notice = searchParams.get('slack') === 'connected' ? 'Slack connected.' : '';
  const isWelcome = searchParams.get('welcome') === '1';

  const clearWelcomeParam = useCallback(() => {
    setSearchParams((params) => {
      params.delete('welcome');
      return params;
    });
  }, [setSearchParams]);

  useEffect(() => {
    function refreshSlack() {
      api
        .slackStatus()
        .then((status) => {
          setSlack(status);
          setSlackLoaded(true);
        })
        .catch(() => setSlackLoaded(true));
    }
    refreshSlack();
    window.addEventListener('focus', refreshSlack);
    return () => window.removeEventListener('focus', refreshSlack);
  }, []);

  useEffect(() => {
    if (!user || !isWelcome || !slackLoaded || slack.connected) return;
    if (localStorage.getItem(slackPromptKey(user.id))) {
      clearWelcomeParam();
      return;
    }

    const timer = window.setTimeout(() => setShowSlackPrompt(true), 5000);
    return () => window.clearTimeout(timer);
  }, [user, isWelcome, slackLoaded, slack.connected, clearWelcomeParam]);

  useEffect(() => {
    if (slack.connected) setShowSlackPrompt(false);
  }, [slack.connected]);

  function dismissSlackPrompt() {
    if (user) localStorage.setItem(slackPromptKey(user.id), '1');
    setShowSlackPrompt(false);
    clearWelcomeParam();
  }

  function connectSlack() {
    window.open('/api/auth/slack', '_blank', 'noopener,noreferrer');
    dismissSlackPrompt();
  }

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
      {showSlackPrompt && <SlackConnectPrompt onDismiss={dismissSlackPrompt} onConnect={connectSlack} />}
    </div>
  );
}
