import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { statusLabels, statusStyles } from '../components/EmailTable';
import { BackIcon } from '../components/icons';
import type { EmailDetail } from '../types';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setEmail(null);
    setError('');
    api.detail(id).then(setEmail).catch((err: Error) => setError(err.message));
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="rounded-full p-1 text-ink hover:bg-surface">
          <BackIcon />
        </button>
        <h1 className="truncate text-xl text-ink sm:text-2xl">{email?.subject ?? 'Email'}</h1>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!email && !error && <p className="text-muted">Loading…</p>}

      {email && (
        <>
          <div className="flex items-center gap-3 border-b border-divider pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {email.from[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{email.from}</p>
              <p className="truncate text-xs text-muted">to {email.toEmail}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-muted">{formatTime(email.sentAt ?? email.scheduledAt)}</span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[email.status]}`}>
                {statusLabels[email.status]}
              </span>
            </div>
          </div>

          {email.failReason && <p className="mt-3 text-sm text-red-600">{email.failReason}</p>}

          <div className="mt-4 overflow-hidden rounded-lg bg-surface">
            <iframe title="Email body" sandbox="" srcDoc={email.body} className="h-96 w-full" />
          </div>
        </>
      )}
    </div>
  );
}
