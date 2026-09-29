import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { SendLaterPopover } from '../components/SendLaterPopover';
import { Button, ErrorBanner, Spinner } from '../components/ui';
import { AttachmentIcon, BackIcon, ChevronDownIcon, ClockIcon, UploadIcon } from '../components/icons';
import { MessageEditor } from '../components/MessageEditor';
import { fileToDataUrl, prepareImageAttachment } from '../lib/imageAttachments';
import { formatFileSize } from '../lib/format';

const MAX_EMAIL_BODY_LENGTH = 900_000;
const MAX_RECIPIENTS = 5000;
const EMAIL_PATTERN = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;

const extractEmails = (text: string) => [...new Set((text.match(EMAIL_PATTERN) ?? []).map((e) => e.toLowerCase()))];

const isBodyEmpty = (html: string) => html.replace(/<[^>]*>/g, '').trim().length === 0;

function FieldRow({ label, divider = true, children }: { label: string; divider?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-[39px] w-full items-center gap-1.5">
      <span className="w-12 shrink-0 text-sm text-ink">{label}</span>
      <div className={`flex min-h-[39px] min-w-0 flex-1 items-center ${divider ? 'border-b border-divider' : ''}`}>{children}</div>
    </div>
  );
}

const fieldClass = 'w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none';

export function ComposePage() {
  const { senders, user, sendersError, retrySenders } = useAuth();
  const navigate = useNavigate();

  const [senderId, setSenderId] = useState(senders[0]?.id ?? '');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startAt, setStartAt] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSendLater, setShowSendLater] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (senders[0] && !senderId) setSenderId(senders[0].id);
  }, [senders, senderId]);

  const attachmentUrls = useMemo(() => attachments.map((file) => URL.createObjectURL(file)), [attachments]);

  useEffect(() => () => attachmentUrls.forEach((url) => URL.revokeObjectURL(url)), [attachmentUrls]);

  const visibleChips = recipients.slice(0, 3);
  const overflowCount = recipients.length - visibleChips.length;
  const hasAttachments = attachments.length > 0;
  const hasSchedule = Boolean(startAt);
  const sendersLoading = user && senders.length === 0;

  function addRecipients(text: string) {
    const found = extractEmails(text);
    if (found.length === 0) return false;
    setRecipients((current) => {
      const merged = [...new Set([...current, ...found])];
      if (merged.length > MAX_RECIPIENTS) {
        setError(`Recipient list is capped at ${MAX_RECIPIENTS.toLocaleString()} addresses.`);
        return merged.slice(0, MAX_RECIPIENTS);
      }
      return merged;
    });
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

  async function handleListUpload(file: File | undefined) {
    if (!file) return;
    setLoadingList(true);
    setError('');
    try {
      addRecipients(await file.text());
    } catch {
      setError('Could not read recipient list.');
    } finally {
      setLoadingList(false);
      if (listInputRef.current) listInputRef.current.value = '';
    }
  }

  async function handleAttachmentPick(files: FileList | null) {
    if (!files?.length) return;
    setLoadingAttachments(true);
    setError('');
    try {
      const prepared = await Promise.all(Array.from(files).map(prepareImageAttachment));
      setAttachments((current) => [...current, ...prepared]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingAttachments(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const attachmentHtml = (
        await Promise.all(attachments.map(async (file) => `<p><img src="${await fileToDataUrl(file)}" alt="${file.name}" /></p>`))
      ).join('');
      const fullBody = body + attachmentHtml;
      if (fullBody.length > MAX_EMAIL_BODY_LENGTH) {
        throw new Error('Email body is too large. Remove or shrink image attachments.');
      }
      const result = await api.schedule({
        senderId,
        subject,
        body: fullBody,
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

  const canSend =
    Boolean(senderId) &&
    recipients.length > 0 &&
    subject.trim().length > 0 &&
    (!isBodyEmpty(body) || attachments.length > 0);

  if (user === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
        <Spinner />
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col">
      <div className="flex w-full items-center justify-between gap-5 px-4 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="cursor-pointer rounded-full p-1 text-ink hover:bg-surface">
            <BackIcon />
          </button>
          <h1 className="truncate text-xl text-ink sm:text-2xl">Compose New Email</h1>
        </div>
        <div className="relative flex h-[34px] shrink-0 items-center gap-[10px]">
          <label
            className={`relative flex h-6 w-6 cursor-pointer items-center justify-center ${hasAttachments ? 'text-brand' : 'text-icon'} hover:text-ink ${loadingAttachments ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
              multiple
              className="sr-only"
              disabled={loadingAttachments}
              aria-label="Attach image"
              onChange={(e) => void handleAttachmentPick(e.target.files)}
            />
            {loadingAttachments ? <Spinner className="h-4 w-4" /> : <AttachmentIcon />}
            {hasAttachments && !loadingAttachments && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-[9px] font-semibold text-white">
                {attachments.length}
              </span>
            )}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSendLater((v) => !v)}
              aria-label="Send later"
              aria-expanded={showSendLater}
              className={`flex h-6 w-6 cursor-pointer items-center justify-center ${hasSchedule ? 'text-brand' : 'text-icon'} hover:text-ink`}
            >
              <ClockIcon className="h-4 w-4" />
            </button>
            {showSendLater && (
              <SendLaterPopover startAt={startAt} onPick={setStartAt} onClose={() => setShowSendLater(false)} />
            )}
          </div>
          <Button
            type="submit"
            variant="ghost"
            disabled={submitting || !canSend}
            className={`h-[34px] px-[19px] py-[7px] text-sm leading-none ${startAt ? 'min-w-[100px]' : 'w-[100px]'}`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-1.5">
                <Spinner className="h-3.5 w-3.5 border-brand border-r-transparent" />
                …
              </span>
            ) : startAt ? (
              'Send Later'
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-4 pt-4 pb-6 sm:px-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        <div className="flex w-full flex-col gap-4">
          <FieldRow label="From" divider={false}>
            {sendersError ? (
              <span className="flex items-center gap-2 text-sm text-red-600">
                {sendersError}
                <button type="button" onClick={retrySenders} className="cursor-pointer font-medium text-brand underline">
                  Retry
                </button>
              </span>
            ) : sendersLoading ? (
              <span className="flex items-center gap-2 text-sm text-muted">
                <Spinner />
                Loading senders…
              </span>
            ) : (
              <div className="relative inline-flex items-center rounded-lg bg-surface py-2 pl-2.5 pr-8">
                <select
                  className="appearance-none bg-transparent text-base leading-[120%] text-ink focus:outline-none"
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                  required
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.email}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 text-icon" />
              </div>
            )}
          </FieldRow>

          <FieldRow label="To">
            <div className="flex w-full items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                  className={`${fieldClass} min-w-[120px] flex-1`}
                  value={recipientDraft}
                  onChange={(e) => handleRecipientDraftChange(e.target.value)}
                  onKeyDown={handleRecipientKeyDown}
                  onBlur={() => addRecipients(recipientDraft) && setRecipientDraft('')}
                  placeholder={recipients.length === 0 ? 'recipient@example.com' : ''}
                />
              </div>
              <label
                className={`ml-auto flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-xs font-medium ${loadingList ? 'text-muted' : 'text-brand'}`}
              >
                {loadingList ? <Spinner className="h-3.5 w-3.5" /> : <UploadIcon />}
                Upload List
                <input
                  ref={listInputRef}
                  type="file"
                  accept=".csv,.txt"
                  disabled={loadingList}
                  onChange={(e) => void handleListUpload(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </FieldRow>

          <FieldRow label="Subject">
            <input
              className={fieldClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              required
              maxLength={191}
            />
          </FieldRow>

          <div className="flex min-h-[39px] flex-wrap items-center gap-x-2 gap-y-3 text-sm text-ink sm:gap-x-3">
            <span>Delay between 2 emails</span>
            <input
              type="number"
              min={0}
              max={86_400}
              step="any"
              placeholder="00"
              className="w-[70px] rounded-lg border border-border px-2.5 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
            />
            <span className="ml-4">Hourly Limit</span>
            <input
              type="number"
              min={1}
              placeholder="00"
              className="w-[70px] rounded-lg border border-border px-2.5 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
            />
          </div>
        </div>

        <MessageEditor value={body} onChange={setBody} placeholder="Type Your Reply…" />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {attachments.map((file, i) => (
              <div key={`${file.name}-${i}`} className="w-[210px] shrink-0 overflow-hidden rounded-[10px] border border-border">
                <div className="relative h-[117px] w-[210px]">
                  <button
                    type="button"
                    onClick={() => setPreview({ src: attachmentUrls[i], alt: file.name })}
                    className="block h-full w-full cursor-pointer"
                    aria-label={`Preview ${file.name}`}
                  >
                    <img src={attachmentUrls[i]} alt={file.name} className="h-full w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachments((current) => current.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${file.name}`}
                    className="absolute right-2 top-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-ink/60 text-xs text-white hover:bg-ink/80"
                  >
                    ×
                  </button>
                </div>
                <div className="flex flex-col gap-0.5 border-t border-divider bg-surface-soft px-2.5 py-2">
                  <p className="truncate text-sm font-medium leading-5 tracking-[-0.15px] text-ink">{file.name}</p>
                  <p className="text-xs leading-4 text-muted">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && <ImagePreviewModal src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />}
    </form>
  );
}
