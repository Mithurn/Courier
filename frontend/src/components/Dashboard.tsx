import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Counts, EmailListItem, Page, ScheduleResult, Sender, User } from '../types';
import { ComposeForm } from './ComposeForm';
import { EmailDetailModal } from './EmailDetailModal';
import { EmailTable } from './EmailTable';
import { ErrorBanner } from './ui';
import { Sidebar } from './Sidebar';
import { FilterIcon, MenuIcon, RefreshIcon, SearchIcon } from './icons';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex min-h-screen bg-white text-[#1C1C1C]">
      <Sidebar
        user={user}
        counts={counts}
        tab={tab}
        query={query}
        senderReady={senders.length > 0}
        slack={slack}
        open={sidebarOpen}
        onChangeTab={changeTab}
        onCompose={() => setComposing(true)}
        onDisconnectSlack={disconnectSlack}
        onLogout={onLogout}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1 p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="rounded-full p-1.5 text-[#1C1C1C] hover:bg-[#F4F7F5]">
            <MenuIcon />
          </button>
          <span className="text-sm font-medium capitalize">{query ? 'Search results' : tab}</span>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
        {notice && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="ml-4 font-bold">
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <div className="flex h-[38px] min-w-0 flex-1 items-center gap-1.5 rounded-full bg-[#F4F7F5] px-4">
            <SearchIcon className="shrink-0 text-[#99A1AF]" />
            <input
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search scheduled and sent emails"
              className="w-full min-w-0 bg-transparent text-sm text-[#1C1C1C] placeholder:text-[#99A1AF] focus:outline-none"
            />
          </div>
          <button
            disabled
            title="Filtering is not available yet"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#99A1AF] disabled:cursor-not-allowed"
          >
            <FilterIcon />
          </button>
          <button
            onClick={load}
            title="Refresh"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#99A1AF] hover:bg-[#F4F7F5]"
          >
            <RefreshIcon />
          </button>
        </div>

        {query && <div className="px-4 py-2 text-sm text-[#636970]">Search results ({data.total})</div>}

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
