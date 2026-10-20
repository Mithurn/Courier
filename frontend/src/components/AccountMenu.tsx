import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { LogoutIcon, SlackIcon } from './icons';
import type { User } from '../types';

type SlackStatus = { connected: boolean; teamName: string | null };

type MenuPos = { top: number; left?: number; right?: number };

const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2.5 rounded px-3 py-2 text-left text-sm hover:bg-surface';

function MenuPanel({
  user,
  slack,
  onDisconnectSlack,
  onClose,
  style,
}: {
  user: User;
  slack: SlackStatus;
  onDisconnectSlack: () => void | Promise<void>;
  onClose: () => void;
  style: CSSProperties;
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
      style={style}
      className="fixed z-50 min-w-60 rounded-lg border border-border bg-white p-1 text-sm shadow-sm"
    >
      <div className="border-b border-divider px-3 py-2.5">
        <p className="truncate font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      {slack.connected ? (
        <button type="button" onClick={() => void handleDisconnect()} className={`${menuItemClass} text-muted`}>
          <SlackIcon className="shrink-0" />
          <span className="min-w-0 truncate">{slack.teamName ?? 'Slack'} · Disconnect</span>
        </button>
      ) : (
        <a
          href="/api/auth/slack"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className={`${menuItemClass} text-brand`}
        >
          <SlackIcon className="shrink-0" />
          Connect Slack
        </a>
      )}
      <button type="button" onClick={() => void handleLogout()} className={`${menuItemClass} text-muted`}>
        <LogoutIcon className="shrink-0" />
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
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos(
        align === 'right'
          ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 4, left: rect.left },
      );
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const menuStyle: CSSProperties | undefined = menuPos
    ? { top: menuPos.top, left: menuPos.left, right: menuPos.right }
    : undefined;

  return (
    <div ref={triggerRef} className="relative">
      {trigger({ open, onClick: () => setOpen((value) => !value) })}
      {open &&
        menuStyle &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
            <MenuPanel
              user={user}
              slack={slack}
              onDisconnectSlack={onDisconnectSlack}
              onClose={() => setOpen(false)}
              style={menuStyle}
            />
          </>,
          document.body,
        )}
    </div>
  );
}
