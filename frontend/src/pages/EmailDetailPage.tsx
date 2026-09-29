import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { ErrorBanner, Spinner } from '../components/ui';
import { ArchiveIcon, BackIcon, ChevronDownIcon, StarIcon, TrashIcon } from '../components/icons';
import type { EmailDetail } from '../types';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function displayNameFromEmail(email: string) {
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseEmailBody(html: string) {
  const attachments: { src: string; alt: string }[] = [];
  const body = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    const alt = tag.match(/\balt="([^"]*)"/i)?.[1] || 'attachment';
    if (src) attachments.push({ src, alt });
    return '';
  });
  return { body, attachments };
}

const bodyStyles = `
  body { margin: 0; font-family: Inter, system-ui, sans-serif; font-size: 16px; line-height: 26px; letter-spacing: -0.31px; color: #1E2939; }
  p { margin: 0 0 16px; }
  p:last-child { margin-bottom: 0; }
  img { max-width: 100%; }
`;

function wrapEmailBody(html: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${bodyStyles}</style></head><body>${html}</body></html>`;
}

export function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);

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

  if (loading && !email) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
        <Spinner />
        Loading…
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full items-center justify-between gap-2.5 px-4 pt-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="shrink-0 rounded-full p-1 text-ink hover:bg-surface">
            <BackIcon />
          </button>
          <h1 className="truncate text-2xl leading-[30px] tracking-[0.07px] text-ink">{email?.subject ?? 'Email'}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-icon">
          <button type="button" aria-label="Star" className="hover:text-ink">
            <StarIcon />
          </button>
          <button type="button" aria-label="Archive" className="hover:text-ink">
            <ArchiveIcon />
          </button>
          <button type="button" aria-label="Delete" className="hover:text-ink">
            <TrashIcon />
          </button>
          {user && (
            user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB] text-xs font-medium text-ink">
                {user.name[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
              </span>
            )
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-4 pt-4 pb-6 sm:px-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        {email && parsed && (
          <>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
                {displayNameFromEmail(email.from)[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  <span className="font-semibold">{displayNameFromEmail(email.from)}</span>{' '}
                  <span className="text-muted">&lt;{email.from}&gt;</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  to me
                  <ChevronDownIcon />
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted">{formatTime(email.sentAt ?? email.scheduledAt)}</span>
            </div>

            {email.failReason && <p className="text-sm text-red-600">{email.failReason}</p>}

            <iframe title="Email body" sandbox="" srcDoc={wrapEmailBody(parsed.body)} className="min-h-[240px] w-full border-0 bg-transparent" />

            {parsed.attachments.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {parsed.attachments.map((file) => (
                  <div key={file.src} className="w-[210px] shrink-0 overflow-hidden rounded-[10px]">
                    <button
                      type="button"
                      onClick={() => setPreview(file)}
                      className="block w-full"
                      aria-label={`Preview ${file.alt}`}
                    >
                      <img src={file.src} alt={file.alt} className="h-[117px] w-full object-cover" />
                    </button>
                    <p className="mt-2 truncate text-sm text-ink">{file.alt}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {preview && <ImagePreviewModal src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />}
    </div>
  );
}
