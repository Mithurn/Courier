import type { EmailListItem } from '../types';
import { StarIcon } from './icons';

const statusStyles: Record<string, string> = {
  scheduled: 'bg-[#FFEDD4] border-[#FFD6A7] text-[#9A5B13]',
  sending: 'bg-[#DBEAFE] border-[#BFDBFE] text-[#1D4ED8]',
  sent: 'bg-[#F3F4F6] border-[#E5E7EB] text-[#374151]',
  failed: 'bg-red-100 border-red-200 text-red-700',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' });

type Props = {
  items: EmailListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  timeField: 'scheduledAt' | 'sentAt';
  onPage: (page: number) => void;
  onOpen: (id: string) => void;
};

export function EmailTable({ items, total, page, pageSize, loading, timeField, onPage, onOpen }: Props) {
  if (loading) return <p className="py-10 text-center text-[#636970]">Loading…</p>;
  if (items.length === 0) return <p className="py-10 text-center text-[#636970]">No emails here yet.</p>;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div>
      <ul>
        {items.map((email) => (
          <li
            key={email.id}
            onClick={() => onOpen(email.id)}
            className="flex h-14 cursor-pointer items-center gap-3 border-b border-[#F3F4F6] px-3 hover:bg-[#F4F7F5] sm:gap-6 sm:px-6 md:gap-12"
          >
            <span className="w-20 shrink-0 truncate text-sm text-[#1C1C1C] sm:w-32 md:w-40">To: {email.toEmail}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span
                className={`hidden shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs sm:inline-flex ${statusStyles[email.status]}`}
              >
                {email.status} · {formatTime(email[timeField] ?? email.scheduledAt)}
              </span>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] sm:hidden ${statusStyles[email.status]}`}
              >
                {email.status}
              </span>
              <span className="min-w-0 truncate text-sm">
                <span className="font-medium text-[#1C1C1C]">{email.subject}</span>
                <span className="hidden text-[#636970] sm:inline"> - {email.failReason ?? email.preview}</span>
              </span>
            </span>
            <StarIcon className="hidden shrink-0 text-[#99A1AF] sm:block" />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-3 px-3 py-3 text-sm text-[#636970] sm:px-6">
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
    </div>
  );
}
