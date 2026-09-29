import { useState } from 'react';
import logo from '../assets/logo.png';
import type { Counts, User } from '../types';

type Tab = 'scheduled' | 'sent';

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
      <path d="M3.5 5.25 7 8.75l3.5-3.5" stroke="#636970" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavItem({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center justify-between rounded-xl px-4 text-sm ${
        active ? 'bg-[#E5F6EC] font-medium text-[#1C1C1C]' : 'text-[#636970]'
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span>{count}</span>
    </button>
  );
}

type Props = {
  user: User;
  counts: Counts;
  tab: Tab;
  query: string;
  senderReady: boolean;
  slack: { connected: boolean; teamName: string | null };
  open: boolean;
  onChangeTab: (tab: Tab) => void;
  onCompose: () => void;
  onDisconnectSlack: () => void;
  onLogout: () => void;
  onClose: () => void;
};

export function Sidebar({ user, counts, tab, query, senderReady, slack, open, onChangeTab, onCompose, onDisconnectSlack, onLogout, onClose }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

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

      <div className="relative mt-2 shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-14 w-full items-center justify-between rounded-2xl bg-[#F4F7F5] px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 overflow-hidden">
            {user.avatarUrl && <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full" />}
            <span className="overflow-hidden leading-tight">
              <span className="block truncate text-sm font-medium text-[#1C1C1C]">{user.name}</span>
              <span className="block truncate text-xs text-[#636970]">{user.email}</span>
            </span>
          </span>
          <ChevronIcon />
        </button>
        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-[#E5E7EB] bg-white p-1 text-sm shadow-sm">
            {slack.connected ? (
              <button onClick={onDisconnectSlack} className="block w-full rounded px-3 py-2 text-left text-[#636970] hover:bg-[#F4F7F5]">
                Slack: {slack.teamName} (disconnect)
              </button>
            ) : (
              <a href="/api/auth/slack" className="block rounded px-3 py-2 text-left text-[#00A63E] hover:bg-[#F4F7F5]">
                Connect Slack
              </a>
            )}
            <button onClick={onLogout} className="block w-full rounded px-3 py-2 text-left text-[#636970] hover:bg-[#F4F7F5]">
              Logout
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 py-2.5">
        <button
          onClick={() => {
            onCompose();
            onClose();
          }}
          disabled={!senderReady}
          className="h-9 w-full rounded-full border border-[#00A63E] text-sm font-medium text-[#00A63E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Compose
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <span className="px-4 pb-1 pt-3 text-xs font-medium tracking-wide text-[#636970]">CORE</span>
        <NavItem
          active={tab === 'scheduled' && !query}
          icon={<ClockIcon />}
          label="Scheduled"
          count={counts.scheduled}
          onClick={() => {
            onChangeTab('scheduled');
            onClose();
          }}
        />
        <NavItem
          active={tab === 'sent' && !query}
          icon={<SentIcon />}
          label="Sent"
          count={counts.sent}
          onClick={() => {
            onChangeTab('sent');
            onClose();
          }}
        />
      </nav>
      </aside>
    </>
  );
}
