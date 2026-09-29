import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

type SlackStatus = { connected: boolean; teamName: string | null };

function MenuPanel({
  user,
  slack,
  onDisconnectSlack,
  onClose,
  align,
}: {
  user: User;
  slack: SlackStatus;
  onDisconnectSlack: () => void | Promise<void>;
  onClose: () => void;
  align: 'left' | 'right';
}) {
  const { logout } = useAuth();

  async function handleLogout() {
    onClose();
    await logout();
  }

  async function handleDisconnect() {
    onClose();
    await onDisconnectSlack();
  }

  return (
    <div
      className={`absolute top-full z-20 mt-1 min-w-[220px] rounded-lg border border-border bg-white p-1 text-sm shadow-sm ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      <div className="border-b border-divider px-3 py-2.5">
        <p className="truncate font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      {slack.connected ? (
        <button type="button" onClick={() => void handleDisconnect()} className="block w-full rounded px-3 py-2 text-left text-muted hover:bg-surface">
          Slack: {slack.teamName} (disconnect)
        </button>
      ) : (
        <a href="/api/auth/slack" onClick={onClose} className="block rounded px-3 py-2 text-left text-brand hover:bg-surface">
          Connect Slack
        </a>
      )}
      <button type="button" onClick={() => void handleLogout()} className="block w-full rounded px-3 py-2 text-left text-muted hover:bg-surface">
        Logout
      </button>
    </div>
  );
}

export function AccountMenu({
  user,
  slack,
  onDisconnectSlack,
  trigger,
  align = 'left',
}: {
  user: User;
  slack: SlackStatus;
  onDisconnectSlack: () => void | Promise<void>;
  trigger: (props: { open: boolean; onClick: () => void }) => ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
      {trigger({ open, onClick: () => setOpen((value) => !value) })}
      {open && (
        <MenuPanel
          user={user}
          slack={slack}
          onDisconnectSlack={onDisconnectSlack}
          onClose={() => setOpen(false)}
          align={align}
        />
      )}
    </div>
  );
}
