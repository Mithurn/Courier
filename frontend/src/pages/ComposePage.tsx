import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorBanner } from '../components/ui';
import { AttachmentIcon, BackIcon, CalendarIcon, ClockIcon, UploadIcon } from '../components/icons';
import { MessageEditor } from '../components/MessageEditor';

const EMAIL_PATTERN = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;

const extractEmails = (text: string) => [...new Set((text.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase()))];

const isBodyEmpty = (html: string) => html.replace(/<[^>]*>/g, '').trim().length === 0;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-divider px-4 py-3 sm:flex-row sm:items-start sm:gap-4 sm:py-3.5">
      <span className="w-full shrink-0 pt-1.5 text-sm text-ink sm:w-24">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldClass = 'w-full min-w-0 bg-transparent py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none';

const SEND_LATER_PRESETS = [
  { label: 'Tomorrow', hour: 9 },
  { label: 'Tomorrow, 10:00 AM', hour: 10 },
  { label: 'Tomorrow, 11:00 AM', hour: 11 },
  { label: 'Tomorrow, 3:00 PM', hour: 15 },
];

function tomorrowAt(hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SendLaterPopover({
  startAt,
  onPick,
  onClose,
}: {
  startAt: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(startAt);

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-border bg-white p-4 shadow-lg">
      <p className="text-sm font-semibold text-ink">Send Later</p>
      <label className="mt-3 flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted">
        <input
          type="datetime-local"
          className="min-w-0 flex-1 bg-transparent focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <CalendarIcon className="shrink-0 text-icon" />
      </label>
      <ul className="mt-3 space-y-2.5">
        {SEND_LATER_PRESETS.map((preset) => (
          <li key={preset.label}>
            <button
              type="button"
              className="text-sm text-ink hover:text-brand"
              onClick={() => setDraft(toLocalInputValue(tomorrowAt(preset.hour)))}
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-4 text-sm">
        <button type="button" className="font-medium text-ink" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="rounded-full border border-brand px-4 py-1 font-medium text-brand hover:bg-brand-soft"
          onClick={() => {
            onPick(draft);
            onClose();
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function ComposePage() {
  const { senders } = useAuth();
  const navigate = useNavigate();

  const [senderId, setSenderId] = useState(senders[0]?.id ?? '');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startAt, setStartAt] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSendLater, setShowSendLater] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const visibleChips = recipients.slice(0, 3);
  const overflowCount = recipients.length - visibleChips.length;

  function addRecipients(text: string) {
    const found = extractEmails(text);
    if (found.length === 0) return false;
    setRecipients((current) => [...new Set([...current, ...found])]);
    return true;
  }

  function handleRecipientDraftChange(text: string) {
    if (/[,;\s]$/.test(text)) {
      addRecipients(text);
      setRecipientDraft('');
    } else {
      setRecipientDraft(text);
    }
  }

  function handleRecipientKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (addRecipients(recipientDraft)) setRecipientDraft('');
    } else if (event.key === 'Backspace' && recipientDraft === '' && recipients.length > 0) {
      setRecipients((current) => current.slice(0, -1));
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    addRecipients(await file.text());
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const attachmentHtml = (
        await Promise.all(attachments.map(async (file) => `<p><img src="${await fileToDataUrl(file)}" alt="${file.name}" /></p>`))
      ).join('');
      const result = await api.schedule({
        senderId,
        subject,
        body: body + attachmentHtml,
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
        <div className="relative flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            aria-label="Attach image"
            className="relative text-icon hover:text-ink"
          >
            <AttachmentIcon />
            {attachments.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-[9px] font-semibold text-white">
                {attachments.length}
              </span>
            )}
          </button>
          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setAttachments((current) => [...current, ...Array.from(e.target.files ?? [])])}
          />
          <button type="button" onClick={() => setShowSendLater((v) => !v)} aria-label="Send later" className="text-icon hover:text-ink">
            <ClockIcon className="h-4 w-4" />
          </button>
          <Button
            type="submit"
            variant="ghost"
            disabled={submitting || recipients.length === 0 || !senderId || isBodyEmpty(body)}
          >
            {submitting ? 'Scheduling…' : startAt ? 'Send Later' : 'Send'}
          </Button>
          {showSendLater && (
            <SendLaterPopover startAt={startAt} onPick={setStartAt} onClose={() => setShowSendLater(false)} />
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <div className="border-t border-divider">
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
          <div className="flex flex-wrap items-center gap-2">
            {visibleChips.map((email) => (
              <span key={email} className="rounded-full border border-brand px-3 py-1 text-xs text-brand">
                {email}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="rounded-full border border-brand px-3 py-1 text-xs text-brand">+{overflowCount}</span>
            )}
            <input
              type="text"
              className={`${fieldClass} min-w-[160px] flex-1 py-1`}
              value={recipientDraft}
              onChange={(e) => handleRecipientDraftChange(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              onBlur={() => addRecipients(recipientDraft) && setRecipientDraft('')}
              placeholder={recipients.length === 0 ? 'recipient@example.com' : ''}
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-xs font-medium text-brand">
              <UploadIcon />
              Upload List
              <input type="file" accept=".csv,.txt" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
            </label>
          </div>
        </FieldRow>

        <FieldRow label="Subject">
          <input className={fieldClass} value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={191} />
        </FieldRow>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-divider px-4 py-3.5 text-sm text-ink sm:gap-x-3">
          <span>Delay between 2 emails</span>
          <input
            type="number"
            min={0}
            step="any"
            className="w-14 rounded-md border border-border px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(e.target.value)}
          />
          <span className="ml-4">Hourly Limit</span>
          <input
            type="number"
            min={1}
            placeholder="00"
            className="w-14 rounded-md border border-border px-2 py-1 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <MessageEditor value={body} onChange={setBody} placeholder="Type Your Reply…" />
      </div>

      {attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {attachments.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative h-20 w-28 overflow-hidden rounded-lg">
              <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setAttachments((current) => current.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${file.name}`}
                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink/60 text-[10px] text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
