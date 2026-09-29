import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import DOMPurify from 'dompurify';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { AccountMenu } from '../components/AccountMenu';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { RecipientLabel } from '../components/RecipientLabel';
import { ErrorBanner, Spinner } from '../components/ui';
import { ArchiveIcon, BackIcon, StarIcon, TrashIcon } from '../components/icons';
import { formatDateTime, formatFileSize } from '../lib/format';
import type { EmailDetail } from '../types';

const formatTime = (iso: string) => formatDateTime(iso, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function displayNameFromEmail(email: string) {
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Base64 data URLs carry no size metadata — decoded byte length approximates it (3/4 of the base64 string, minus padding). */
function dataUrlSize(src: string) {
  const base64 = src.slice(src.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.round((base64.length * 3) / 4) - padding;
}

function parseEmailBody(html: string) {
  const attachments: { src: string; alt: string; size: number }[] = [];
  const stripped = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    const alt = tag.match(/\balt="([^"]*)"/i)?.[1] || 'attachment';
    if (src) attachments.push({ src, alt, size: dataUrlSize(src) });
    return '';
  });
  // Email bodies are freeform HTML from the composer (or the raw API) — never trust it unsanitized.
  const body = DOMPurify.sanitize(stripped);
  return { body, attachments };
}

export function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [slack, setSlack] = useState<{ connected: boolean; teamName: string | null }>({ connected: false, teamName: null });

  useEffect(() => {
    api.slackStatus().then(setSlack).catch(() => undefined);
  }, []);

  async function disconnectSlack() {
    await api.slackDisconnect();
    setSlack({ connected: false, teamName: null });
  }

  async function toggleStar() {
    if (!email) return;
    const starred = !email.starred;
    setEmail({ ...email, starred });
    try {
      await api.updateFlags(email.id, { starred });
    } catch (err) {
      setError((err as Error).message);
      setEmail((e) => (e ? { ...e, starred: !starred } : e));
    }
  }

  async function toggleArchive() {
    if (!email) return;
    const archived = !email.archived;
    try {
      await api.updateFlags(email.id, { archived });
      navigate(-1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function moveToTrash() {
    if (!email) return;
    try {
      await api.updateFlags(email.id, { trashed: true });
      navigate(-1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    if (!id) return;
    setEmail(null);
    setError('');
    setLoading(true);
    api
      .detail(id)
      .then(setEmail)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const parsed = useMemo(() => (email ? parseEmailBody(email.body) : null), [email]);

  function handleBodyClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    setPreview({ src: target.src, alt: target.alt || 'attachment' });
  }

  if (loading && !email) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
        <Spinner />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col gap-5">
      <div className="flex w-full shrink-0 items-center justify-between gap-2.5 px-4 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="shrink-0 cursor-pointer rounded-full p-1 text-ink hover:bg-surface">
            <BackIcon />
          </button>
          <h1 className="truncate text-2xl leading-[30px] tracking-[0.07px] text-ink">{email?.subject ?? 'Email'}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-icon">
          <button
            type="button"
            aria-label={email?.starred ? 'Unstar' : 'Star'}
            aria-pressed={email?.starred}
            onClick={toggleStar}
            disabled={!email}
            className={`cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${email?.starred ? 'text-brand' : 'hover:text-ink'}`}
          >
            <StarIcon className={email?.starred ? 'fill-current' : undefined} />
          </button>
          <button
            type="button"
            aria-label={email?.archived ? 'Unarchive' : 'Archive'}
            aria-pressed={email?.archived}
            onClick={toggleArchive}
            disabled={!email}
            className={`cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${email?.archived ? 'text-brand' : 'hover:text-ink'}`}
          >
            <ArchiveIcon />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={moveToTrash}
            disabled={!email}
            className="cursor-pointer hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TrashIcon />
          </button>
          <span className="h-5 w-px shrink-0 bg-divider" />
          {user && (
            <AccountMenu
              user={user}
              slack={slack}
              onDisconnectSlack={disconnectSlack}
              align="right"
              trigger={({ onClick }) => (
                <button type="button" onClick={onClick} aria-label="Account menu" className="shrink-0 cursor-pointer rounded-full">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E7EB] text-xs font-medium text-ink">
                      {user.name[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
                    </span>
                  )}
                </button>
              )}
            />
          )}
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col px-4 pt-4 pb-6 sm:px-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        {email && parsed && (
          <>
            <div className="flex shrink-0 items-start gap-3 pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
                {displayNameFromEmail(email.from)[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  <span className="font-semibold">{displayNameFromEmail(email.from)}</span>{' '}
                  <span className="text-muted">&lt;{email.from}&gt;</span>
                </p>
                <RecipientLabel toEmail={email.toEmail} viewerEmail={user?.email} />
              </div>
              <span className="shrink-0 text-xs text-muted">{formatTime(email.sentAt ?? email.scheduledAt)}</span>
            </div>

            {email.failReason && <p className="mb-4 shrink-0 text-sm text-red-600">{email.failReason}</p>}

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div
                className="text-base leading-[26px] tracking-[-0.31px] text-ink [&_img]:cursor-pointer [&_p]:mb-4 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: parsed.body }}
                onClick={handleBodyClick}
              />

              {parsed.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 pb-2">
                  {parsed.attachments.map((file) => (
                    <div key={file.src} className="w-[210px] shrink-0 overflow-hidden rounded-[10px] border border-border">
                      <button
                        type="button"
                        onClick={() => setPreview(file)}
                        className="block h-[117px] w-full cursor-pointer"
                        aria-label={`Preview ${file.alt}`}
                      >
                        <img src={file.src} alt={file.alt} className="h-full w-full object-cover" />
                      </button>
                      <div className="flex flex-col gap-0.5 border-t border-divider bg-surface-soft px-2.5 py-2">
                        <p className="truncate text-sm font-medium leading-5 tracking-[-0.15px] text-ink">{file.alt}</p>
                        <p className="text-xs leading-4 text-muted">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {preview && <ImagePreviewModal src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />}
    </div>
  );
}
