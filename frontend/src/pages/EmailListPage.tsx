import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api';
import type { DashboardOutletContext } from '../components/DashboardLayout';
import { EmailTable } from '../components/EmailTable';
import { ErrorBanner, Toast } from '../components/ui';
import { FilterIcon, RefreshIcon, SearchIcon } from '../components/icons';
import type { EmailLabel, EmailListItem, Page } from '../types';

type Tab = 'scheduled' | 'sent';
type StatusFilter = 'all' | 'scheduled' | 'sending' | 'sent' | 'failed';
const PAGE_SIZE = 10;

const STATUS_OPTIONS: Record<Tab, readonly StatusFilter[]> = {
  scheduled: ['all', 'scheduled', 'sending'],
  sent: ['all', 'sent', 'failed'],
};

const LABEL_OPTIONS: { value: EmailLabel; label: string }[] = [
  { value: 'starred', label: 'Favorites' },
  { value: 'archived', label: 'Archived' },
  { value: 'trashed', label: 'Trash' },
];

export function EmailListPage({ tab }: { tab: Tab }) {
  const { setCounts } = useOutletContext<DashboardOutletContext>();
  const navigate = useNavigate();
  const location = useLocation();
  const filterRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [labelFilter, setLabelFilter] = useState<EmailLabel | undefined>(undefined);
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<Page<EmailListItem>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; variant: 'scheduled' | 'success' | 'error' | 'info'; duration?: number } | null>(() => {
    const state = location.state as { notice?: string; variant?: 'scheduled' | 'success' | 'error' | 'info' } | null;
    return state?.notice ? { message: state.notice, variant: state.variant ?? 'scheduled', duration: 2000 } : null;
  });

  useEffect(() => {
    setStatusFilter('all');
    setLabelFilter(undefined);
    setPage(1);
    setFilterOpen(false);
  }, [tab]);

  useEffect(() => {
    if (!filterOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [filterOpen]);

  const prevSentRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = query
        ? api.search(query, page)
        : tab === 'scheduled'
          ? api.scheduled(page, statusFilter === 'scheduled' || statusFilter === 'sending' ? statusFilter : undefined, labelFilter)
          : api.sent(page, statusFilter === 'sent' || statusFilter === 'failed' ? statusFilter : undefined, labelFilter);
      const [items, nextCounts] = await Promise.all([list, api.counts()]);
      setData(items);
      setCounts(nextCounts);
      prevSentRef.current = nextCounts.sent;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, page, query, statusFilter, labelFilter, setCounts]);

  const poll = useCallback(async () => {
    try {
      const list = query
        ? api.search(query, page)
        : tab === 'scheduled'
          ? api.scheduled(page, statusFilter === 'scheduled' || statusFilter === 'sending' ? statusFilter : undefined, labelFilter)
          : api.sent(page, statusFilter === 'sent' || statusFilter === 'failed' ? statusFilter : undefined, labelFilter);
      const [items, nextCounts] = await Promise.all([list, api.counts()]);
      setData(items);
      setCounts(nextCounts);

      // Only notify when sent count strictly increases from previous check
      if (prevSentRef.current !== null && nextCounts.sent > prevSentRef.current) {
        const diff = nextCounts.sent - prevSentRef.current;
        prevSentRef.current = nextCounts.sent;

        try {
          const recent = await api.sent(1);
          const finishedBatch = recent.items.slice(0, diff);
          const failedCount = finishedBatch.filter((e) => e.status === 'failed').length;
          const sentCount = diff - failedCount;

          if (failedCount > 0 && sentCount > 0) {
            setToast({
              message: `${sentCount} sent, ${failedCount} failed delivery`,
              variant: 'error',
              duration: 4000,
            });
          } else if (failedCount > 0) {
            setToast({
              message: `${failedCount} email${failedCount > 1 ? 's' : ''} failed delivery`,
              variant: 'error',
              duration: 4000,
            });
          } else {
            setToast({
              message: diff === 1 ? '1 email sent successfully!' : `${diff} emails sent successfully!`,
              variant: 'success',
              duration: 4000,
            });
          }
        } catch {
          setToast({
            message: diff === 1 ? '1 email sent successfully!' : `${diff} emails sent successfully!`,
            variant: 'success',
            duration: 4000,
          });
        }
      } else {
        prevSentRef.current = nextCounts.sent;
      }
    } catch {
      // background polling errors are ignored
    }
  }, [tab, page, query, statusFilter, labelFilter, setCounts]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      poll();
    }, 4000);
    return () => clearInterval(timer);
  }, [load, poll]);

  useEffect(() => {
    if (toast) navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStar(id: string, starred: boolean) {
    setData((d) => ({ ...d, items: d.items.map((e) => (e.id === id ? { ...e, starred } : e)) }));
    try {
      await api.updateFlags(id, { starred });
      if (labelFilter === 'starred' && !starred) load();
    } catch (err) {
      setError((err as Error).message);
      load();
    }
  }

  return (
    <>
      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <div className="flex h-[38px] w-full max-w-[672px] min-w-0 items-center gap-1.5 rounded-full bg-surface px-4">
          <SearchIcon className="shrink-0 text-icon" />
          <input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search"
            className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-icon focus:outline-none"
          />
        </div>
        <div ref={filterRef} className="relative shrink-0">
          <button
            disabled={!!query}
            title="Filter"
            onClick={() => setFilterOpen((open) => !open)}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
              statusFilter !== 'all' || labelFilter ? 'text-brand' : 'text-icon'
            }`}
          >
            <FilterIcon />
          </button>
          {filterOpen && !query && (
            <div className="absolute right-0 top-10 z-10 w-40 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg">
              {STATUS_OPTIONS[tab].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setPage(1);
                    setStatusFilter(option);
                    setLabelFilter(undefined);
                    setFilterOpen(false);
                  }}
                  className={`block w-full cursor-pointer px-4 py-2 text-left text-sm capitalize hover:bg-surface ${
                    statusFilter === option && !labelFilter ? 'font-semibold text-brand' : 'text-ink'
                  }`}
                >
                  {option}
                </button>
              ))}
              <div className="my-1 h-px bg-divider" />
              {LABEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPage(1);
                    setStatusFilter('all');
                    setLabelFilter(option.value);
                    setFilterOpen(false);
                  }}
                  className={`block w-full cursor-pointer px-4 py-2 text-left text-sm hover:bg-surface ${
                    labelFilter === option.value ? 'font-semibold text-brand' : 'text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={load}
          title="Refresh"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-icon hover:bg-surface"
        >
          <RefreshIcon />
        </button>
      </div>

      {query && <div className="px-4 py-2 text-sm text-muted">Search results ({data.total})</div>}

      <EmailTable
        items={data.items}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        timeField={tab === 'sent' && !query ? 'sentAt' : 'scheduledAt'}
        onPage={setPage}
        onOpen={(id) => navigate(`/email/${id}`)}
        onToggleStar={toggleStar}
      />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
