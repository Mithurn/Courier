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
        <div className="absolute left-0 top-full z-10 mt-2 min-w-[200px] rounded-lg border border-border bg-white px-3.5 py-2.5 shadow-lg">
          <span className="absolute -top-1 left-3 h-2 w-2 rotate-45 border-l border-t border-border bg-white" />
          <p className="text-xs text-muted">To</p>
          <p className="text-sm text-ink">{toEmail}</p>
        </div>
      )}
    </div>
  );
}
