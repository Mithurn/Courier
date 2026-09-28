import type { EmailListItem } from '../types';
import { Button } from './ui';

const statusStyles: Record<string, string> = {
  scheduled: 'bg-orange-100 text-orange-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
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
  if (loading) return <p className="py-10 text-center text-gray-500">Loading…</p>;
  if (items.length === 0) return <p className="py-10 text-center text-gray-500">No emails here yet.</p>;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {items.map((email) => (
          <li key={email.id} onClick={() => onOpen(email.id)} className="flex cursor-pointer items-center gap-4 px-2 py-3 hover:bg-gray-50">
            <span className="w-56 shrink-0 truncate text-sm">To: {email.toEmail}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusStyles[email.status]}`}>
              {email.status} · {formatTime(email[timeField] ?? email.scheduledAt)}
            </span>
            <span className="truncate text-sm">
              <span className="font-medium">{email.subject}</span>
              <span className="text-gray-500"> - {email.failReason ?? email.preview}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-end gap-3 text-sm text-gray-600">
        <span>
          Page {page} of {pages} · {total} total
        </span>
        <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        <Button variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
