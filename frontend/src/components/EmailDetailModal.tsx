import { useEffect, useState } from 'react';
import { api } from '../api';
import type { EmailDetail } from '../types';
import { Modal } from './ui';

export function EmailDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.detail(id).then(setEmail).catch((err: Error) => setError(err.message));
  }, [id]);

  return (
    <Modal title={email?.subject ?? 'Email'} onClose={onClose}>
      {error && <p className="text-red-600">{error}</p>}
      {!email && !error && <p className="text-gray-500">Loading…</p>}
      {email && (
        <div className="space-y-3 text-sm">
          <p className="text-gray-600">
            From {email.from} to {email.toEmail} · {email.status}
            {email.failReason && <span className="text-red-600"> ({email.failReason})</span>}
          </p>
          <iframe title="Email body" sandbox="" srcDoc={email.body} className="h-80 w-full rounded border border-gray-200" />
        </div>
      )}
    </Modal>
  );
}
