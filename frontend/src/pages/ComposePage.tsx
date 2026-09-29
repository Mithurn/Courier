import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorBanner } from '../components/ui';
import { BackIcon, UploadIcon } from '../components/icons';

const EMAIL_PATTERN = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;

const extractEmails = (text: string) => [...new Set((text.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase()))];

const toHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-full shrink-0 text-sm text-ink sm:w-28">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldClass = 'w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none';

export function ComposePage() {
  const { senders } = useAuth();
  const navigate = useNavigate();

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
      navigate('/dashboard', { state: { notice: `Scheduled ${result.count} emails (hourly limit ${result.hourlyLimit}).` } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="rounded-full p-1 text-ink hover:bg-surface">
            <BackIcon />
          </button>
          <h1 className="truncate text-xl text-ink sm:text-2xl">Compose New Email</h1>
        </div>
        <Button type="submit" disabled={submitting || recipients.length === 0 || !senderId} className="shrink-0">
          {submitting ? 'Scheduling…' : `Schedule ${recipients.length || ''}`.trim()}
        </Button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <div className="rounded-lg border border-border">
        <FieldRow label="From">
          <select className={fieldClass} value={senderId} onChange={(e) => setSenderId(e.target.value)} required>
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.email}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="To">
          <div className="flex items-start gap-3">
            <textarea
              className={`${fieldClass} h-16 resize-none`}
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              placeholder="recipient@example.com, one per line or comma separated"
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap pt-1 text-xs font-medium text-brand">
              <UploadIcon />
              Upload list
              <input type="file" accept=".csv,.txt" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
            </label>
          </div>
          {recipientsText && <p className="mt-1 text-xs text-muted">{recipients.length} recipients detected</p>}
        </FieldRow>

        <FieldRow label="Subject">
          <input className={fieldClass} value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={191} />
        </FieldRow>

        <FieldRow label="Start time">
          <input
            type="datetime-local"
            className={fieldClass}
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
          <span className="mt-1 block text-xs text-muted">Leave blank to send as soon as possible</span>
        </FieldRow>

        <FieldRow label="Delay & limit">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step="any"
                className="w-16 rounded-md border border-border px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(e.target.value)}
              />
              <span className="text-xs text-muted">sec delay between sends</span>
            </span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                placeholder="default"
                className="w-20 rounded-md border border-border px-2 py-1 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
              />
              <span className="text-xs text-muted">emails / hour</span>
            </span>
          </div>
        </FieldRow>
      </div>

      <label className="mt-4 block text-sm text-ink">Message</label>
      <textarea
        className="mt-1 h-48 w-full rounded-lg bg-surface p-4 text-sm text-ink placeholder:text-muted focus:outline-none"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type your message…"
        required
      />
    </form>
  );
}
