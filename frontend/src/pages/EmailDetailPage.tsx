import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import type { EmailDetail } from '../types';

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
        <button onClick={() => navigate(-1)} className="text-xl text-muted hover:text-ink" aria-label="Back">
          ←
        </button>
        <h1 className="truncate text-lg font-semibold text-ink">{email?.subject ?? 'Email'}</h1>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!email && !error && <p className="text-muted">Loading…</p>}
      {email && (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            From {email.from} to {email.toEmail} · {email.status}
            {email.failReason && <span className="text-red-600"> ({email.failReason})</span>}
          </p>
          <iframe title="Email body" sandbox="" srcDoc={email.body} className="h-80 w-full rounded border border-border" />
        </div>
      )}
    </div>
  );
}
