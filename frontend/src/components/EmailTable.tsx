import { useEffect, useState } from 'react';
import type { EmailListItem } from '../types';
import { ScheduledClockIcon, StarIcon } from './icons';
import { formatDateTime } from '../lib/format';

export const statusStyles: Record<string, string> = {
  scheduled: 'bg-pill-scheduled-bg border-pill-scheduled-border text-pill-scheduled-text',
  sending: 'bg-pill-sending-bg border-pill-sending-border text-pill-sending-text',
  sent: 'bg-pill-sent-bg border-pill-sent-border text-pill-sent-text',
  failed: 'bg-red-100 border-red-200 text-red-700',
};

export const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
};

const formatTime = (iso: string) => formatDateTime(iso, { weekday: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' });

function formatScheduledTime(scheduledAtIso: string, now: number) {
  const target = new Date(scheduledAtIso).getTime();
  const diffSec = Math.round((target - now) / 1000);

  if (diffSec <= 0) return 'Due now';
  if (diffSec < 60) return `in ${diffSec}s`;
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `in ${m}m ${s < 10 ? '0' : ''}${s}s`;
  }
  return formatTime(scheduledAtIso);
}

type Props = {
  items: EmailListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  timeField: 'scheduledAt' | 'sentAt';
  onPage: (page: number) => void;
  onOpen: (id: string) => void;
  onToggleStar: (id: string, starred: boolean) => void;
};

export function EmailTable({ items, total, page, pageSize, loading, timeField, onPage, onOpen, onToggleStar }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <p className="py-10 text-center text-muted">Loading…</p>;
  if (items.length === 0) return <p className="py-10 text-center text-muted">No emails here yet.</p>;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div>
      <ul>
        {items.map((email) => {
          const fullTime = formatTime(email[timeField] ?? email.scheduledAt);
          const showTimeInPill = email.status === 'scheduled' || email.status === 'sending';
          const pillText =
            email.status === 'scheduled'
              ? formatScheduledTime(email.scheduledAt, now)
              : email.status === 'sending'
                ? 'Sending…'
                : statusLabels[email.status];
          return (
            <li
              key={email.id}
              onClick={() => onOpen(email.id)}
              className="group flex h-14 cursor-pointer items-center gap-3 border-b border-divider px-3 hover:bg-surface sm:gap-12 sm:px-6"
            >
              <span className="w-20 shrink-0 truncate text-sm text-ink sm:w-32 md:w-40">To: {email.toEmail}</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span
                  title={fullTime}
                  className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[email.status]}`}
                >
                  {showTimeInPill && <ScheduledClockIcon active />}
                  {pillText}
                </span>
                <span className="min-w-0 truncate text-sm">
                  <span className="font-semibold text-ink">{email.subject}</span>
                  <span className="hidden text-muted sm:inline"> - {email.failReason ?? email.preview}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {!showTimeInPill && (
                  <span className="hidden whitespace-nowrap text-xs text-muted opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
                    {fullTime}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={email.starred ? 'Unstar' : 'Star'}
                  aria-pressed={email.starred}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(email.id, !email.starred);
                  }}
                  className={`hidden shrink-0 cursor-pointer sm:block ${email.starred ? 'text-brand' : 'text-icon hover:text-ink'}`}
                >
                  <StarIcon className={email.starred ? 'fill-current' : undefined} />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-end gap-3 px-3 py-3 text-sm text-muted sm:px-6">
          <span>
            Page {page} of {pages} · {total} total
          </span>
          <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-full px-3 py-1 disabled:opacity-40">
            Prev
          </button>
          <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-full px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
