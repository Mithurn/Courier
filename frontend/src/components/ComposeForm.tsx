import { useMemo, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { ScheduleResult, Sender } from '../types';
import { Button, Modal } from './ui';

const EMAIL_PATTERN = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;

const extractEmails = (text: string) => [...new Set((text.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase()))];

const toHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none';

type Props = {
  senders: Sender[];
  onClose: () => void;
  onScheduled: (result: ScheduleResult) => void;
};

export function ComposeForm({ senders, onClose, onScheduled }: Props) {
  const [senderId, setSenderId] = useState(senders[0]?.id ?? '');
  const [recipientsText, setRecipientsText] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startAt, setStartAt] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const recipients = useMemo(() => extractEmails(recipientsText), [recipientsText]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const found = extractEmails(await file.text());
    setRecipientsText((current) => [...new Set([...extractEmails(current), ...found])].join('\n'));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await api.schedule({
        senderId,
        subject,
        body: toHtml(body),
        recipients,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        delayBetweenSendsMs: delaySeconds ? Math.round(Number(delaySeconds) * 1000) : undefined,
        hourlyLimit: hourlyLimit ? Number(hourlyLimit) : undefined,
      });
      onScheduled(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Compose New Email" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">From</span>
          <select className={inputClass} value={senderId} onChange={(e) => setSenderId(e.target.value)} required>
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between text-gray-600">
            <span>To ({recipients.length} detected)</span>
            <span className="text-green-700">
              Upload list{' '}
              <input type="file" accept=".csv,.txt" onChange={(e) => handleFile(e.target.files?.[0])} className="text-xs" />
            </span>
          </span>
          <textarea
            className={`${inputClass} h-24`}
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            placeholder="recipient@example.com, one per line or comma separated"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">Subject</span>
          <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={191} />
        </label>
        <div className="grid grid-cols-3 gap-4">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Start time (blank = now)</span>
            <input type="datetime-local" className={inputClass} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Delay between emails (s)</span>
            <input type="number" min={0} step="any" className={inputClass} value={delaySeconds} onChange={(e) => setDelaySeconds(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Hourly limit</span>
            <input type="number" min={1} className={inputClass} value={hourlyLimit} onChange={(e) => setHourlyLimit(e.target.value)} placeholder="sender default" />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-600">Message</span>
          <textarea className={`${inputClass} h-40`} value={body} onChange={(e) => setBody(e.target.value)} required />
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || recipients.length === 0 || !senderId}>
            {submitting ? 'Scheduling…' : `Schedule ${recipients.length || ''}`.trim()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
