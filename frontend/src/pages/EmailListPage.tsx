import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../api';
import type { DashboardOutletContext } from '../components/DashboardLayout';
import { EmailTable } from '../components/EmailTable';
import { ErrorBanner, Toast } from '../components/ui';
import { FilterIcon, RefreshIcon, SearchIcon } from '../components/icons';
import type { EmailListItem, Page } from '../types';

type Tab = 'scheduled' | 'sent';
type StatusFilter = 'all' | 'scheduled' | 'sending' | 'sent' | 'failed';
const PAGE_SIZE = 10;

const FILTER_OPTIONS: Record<Tab, readonly StatusFilter[]> = {
  scheduled: ['all', 'scheduled', 'sending'],
  sent: ['all', 'sent', 'failed'],
};

export function EmailListPage({ tab }: { tab: Tab }) {
  const { setCounts } = useOutletContext<DashboardOutletContext>();
  const navigate = useNavigate();
  const location = useLocation();
  const filterRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<Page<EmailListItem>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '');

  useEffect(() => {
    setStatusFilter('all');
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = query
        ? api.search(query, page)
        : tab === 'scheduled'
          ? api.scheduled(page, statusFilter === 'scheduled' || statusFilter === 'sending' ? statusFilter : undefined)
          : api.sent(page, statusFilter === 'sent' || statusFilter === 'failed' ? statusFilter : undefined);
      const [items, nextCounts] = await Promise.all([list, api.counts()]);
      setData(items);
      setCounts(nextCounts);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, page, query, statusFilter, setCounts]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (notice) navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            title="Filter by status"
            onClick={() => setFilterOpen((open) => !open)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-icon hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <FilterIcon />
          </button>
          {filterOpen && !query && (
            <div className="absolute right-0 top-10 z-10 w-36 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg">
              {FILTER_OPTIONS[tab].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setPage(1);
                    setStatusFilter(option);
                    setFilterOpen(false);
                  }}
                  className={`block w-full cursor-pointer px-4 py-2 text-left text-sm capitalize hover:bg-surface ${
                    statusFilter === option ? 'font-semibold text-brand' : 'text-ink'
                  }`}
                >
                  {option}
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
      />

      {notice && <Toast message={notice} onDismiss={() => setNotice('')} />}
    </>
  );
}
