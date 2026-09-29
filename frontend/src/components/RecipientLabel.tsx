import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from './icons';

export function RecipientLabel({ toEmail, viewerEmail }: { toEmail: string; viewerEmail?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isMe = viewerEmail != null && toEmail.toLowerCase() === viewerEmail.toLowerCase();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        {isMe ? 'to me' : `to ${toEmail}`}
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm">
          {toEmail}
        </div>
      )}
    </div>
  );
}
