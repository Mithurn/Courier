import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';
import type { Counts, User } from '../types';
import { AccountMenu } from './AccountMenu';

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function SentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M14 2 7 9M14 2 9.5 14l-2.5-5L2 6.5 14 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3.5 5.25 7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-muted" />
    </svg>
  );
}

function NavItem({
  to,
  end,
  icon,
  label,
  count,
  onClick,
}: {
  to: string;
  end?: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex h-9 items-center justify-between rounded-xl px-4 text-sm ${isActive ? 'bg-brand-soft font-medium text-ink' : 'text-muted'}`
      }
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span>{count}</span>
    </NavLink>
  );
}

type Props = {
  user: User;
  counts: Counts;
  senderReady: boolean;
  slack: { connected: boolean; teamName: string | null };
  open: boolean;
  onDisconnectSlack: () => void;
  onClose: () => void;
};

export function Sidebar({ user, counts, senderReady, slack, open, onDisconnectSlack, onClose }: Props) {
  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-screen w-[260px] shrink-0 flex-col bg-white pb-2 pl-2 pr-4 pt-5 shadow-xl transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[39px] items-center justify-between pb-2.5 pl-3 pr-3">
          <img src={logo} alt="ONB" className="h-6 w-auto" />
        </div>

        <div className="mt-2 shrink-0">
          <AccountMenu
            user={user}
            slack={slack}
            onDisconnectSlack={onDisconnectSlack}
            trigger={({ onClick }) => (
              <button
                type="button"
                onClick={onClick}
                className="flex h-14 w-full items-center justify-between rounded-2xl bg-surface px-3 py-2.5 text-left"
              >
                <span className="flex items-center gap-2 overflow-hidden">
                  {user.avatarUrl && (
                    <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full" />
                  )}
                  <span className="overflow-hidden leading-tight">
                    <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
                    <span className="block truncate text-xs text-muted">{user.email}</span>
                  </span>
                </span>
                <ChevronIcon />
              </button>
            )}
          />
        </div>

        <div className="shrink-0 py-2.5">
          <NavLink
            to="/compose"
            onClick={(e) => {
              if (!senderReady) e.preventDefault();
              onClose();
            }}
            aria-disabled={!senderReady}
            className={`flex h-9 w-full items-center justify-center rounded-full border border-brand text-sm font-medium text-brand ${
              senderReady ? '' : 'cursor-not-allowed opacity-50'
            }`}
          >
            Compose
          </NavLink>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <span className="px-4 pb-1 pt-3 text-xs font-medium tracking-wide text-muted">CORE</span>
          <NavItem to="/dashboard" end icon={<ClockIcon />} label="Scheduled" count={counts.scheduled} onClick={onClose} />
          <NavItem to="/dashboard/sent" icon={<SentIcon />} label="Sent" count={counts.sent} onClick={onClose} />
        </nav>
      </aside>
    </>
  );
}
