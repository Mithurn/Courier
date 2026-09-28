import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Counts, EmailListItem, Page, ScheduleResult, Sender, User } from '../types';
import { ComposeForm } from './ComposeForm';
import { EmailDetailModal } from './EmailDetailModal';
import { EmailTable } from './EmailTable';
import { Button, ErrorBanner } from './ui';

type Tab = 'scheduled' | 'sent';
const PAGE_SIZE = 10;

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('scheduled');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Page<EmailListItem>>({ items: [], total: 0 });
  const [counts, setCounts] = useState<Counts>({ scheduled: 0, sent: 0 });
  const [senders, setSenders] = useState<Sender[]>([]);
  const [slack, setSlack] = useState<{ connected: boolean; teamName: string | null }>({ connected: false, teamName: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = query ? api.search(query, page) : tab === 'scheduled' ? api.scheduled(page) : api.sent(page);
      const [items, nextCounts] = await Promise.all([list, api.counts()]);
      setData(items);
      setCounts(nextCounts);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.slackStatus().then(setSlack).catch(() => undefined);
    api
      .senders()
      .then((list) => (list.length > 0 ? list : api.createSender().then((sender) => [sender])))
      .then(setSenders)
      .catch((err: Error) => setError(err.message));
    if (new URLSearchParams(window.location.search).get('slack') === 'connected') setNotice('Slack connected.');
    window.history.replaceState({}, '', '/dashboard');
  }, []);

  function changeTab(next: Tab) {
    setQuery('');
    setPage(1);
    setTab(next);
  }

  function handleScheduled(result: ScheduleResult) {
    setComposing(false);
    setNotice(`Scheduled ${result.count} emails (hourly limit ${result.hourlyLimit}).`);
    changeTab('scheduled');
    load();
  }

  async function disconnectSlack() {
    await api.slackDisconnect();
    setSlack({ connected: false, teamName: null });
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <span className="text-xl font-bold tracking-widest">ONB</span>
        <div className="flex items-center gap-4 text-sm">
          {slack.connected ? (
            <button onClick={disconnectSlack} className="text-gray-600 underline">
              Slack: {slack.teamName} (disconnect)
            </button>
          ) : (
            <a href="/api/auth/slack" className="text-green-700 underline">
              Connect Slack
            </a>
          )}
          {user.avatarUrl && <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />}
          <div className="leading-tight">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
        {notice && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="ml-4 font-bold">
              ×
            </button>
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <Button onClick={() => setComposing(true)} disabled={senders.length === 0}>
            Compose New Email
          </Button>
          <input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search scheduled and sent emails"
            className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm focus:outline-none"
          />
          <Button variant="ghost" onClick={load}>
            Refresh
          </Button>
        </div>

        <nav className="mb-2 flex gap-6 border-b border-gray-200 text-sm">
          {(['scheduled', 'sent'] as const).map((t) => (
            <button
              key={t}
              onClick={() => changeTab(t)}
              className={`-mb-px border-b-2 px-1 pb-2 capitalize ${tab === t && !query ? 'border-green-600 font-medium text-green-700' : 'border-transparent text-gray-500'}`}
            >
              {t} ({counts[t]})
            </button>
          ))}
          {query && <span className="pb-2 text-gray-500">Search results ({data.total})</span>}
        </nav>

        <EmailTable
          items={data.items}
          total={data.total}
          page={page}
          pageSize={PAGE_SIZE}
          loading={loading}
          timeField={tab === 'sent' && !query ? 'sentAt' : 'scheduledAt'}
          onPage={setPage}
          onOpen={setOpenId}
        />
      </main>

      {composing && <ComposeForm senders={senders} onClose={() => setComposing(false)} onScheduled={handleScheduled} />}
      {openId && <EmailDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
