import { useState } from 'react';
import { CalendarIcon } from './icons';

const SEND_LATER_PRESETS = [
  { label: 'In 2 minutes (Restart test)', minutesAhead: 2 },
  { label: 'Tomorrow', hour: 9 },
  { label: 'Tomorrow, 10:00 AM', hour: 10 },
  { label: 'Tomorrow, 11:00 AM', hour: 11 },
  { label: 'Tomorrow, 3:00 PM', hour: 15 },
];

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

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

function formatPickedDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SendLaterPopover({
  startAt,
  onPick,
  onClose,
}: {
  startAt: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => startAt || toLocalInputValue(minutesFromNow(2)));

  return (
    <div className="absolute right-0 top-full z-20 mt-2 flex h-[364px] w-[318px] max-w-[calc(100vw-2rem)] flex-col rounded-[10px] border border-border bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      <p className="text-sm font-semibold text-ink">Send Later</p>

      <label className="relative mt-4 flex cursor-pointer items-center justify-between border-b border-divider pb-3">
        <span className={`text-sm ${draft ? 'text-ink' : 'text-muted'}`}>
          {draft ? formatPickedDate(draft) : 'Pick date & time'}
        </span>
        <CalendarIcon className="pointer-events-none shrink-0 text-icon" />
        <input
          type="datetime-local"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>

      <ul className="mt-4 flex flex-col gap-3">
        {SEND_LATER_PRESETS.map((preset) => (
          <li key={preset.label}>
            <button
              type="button"
              className="cursor-pointer text-left text-sm text-muted hover:text-ink"
              onClick={() =>
                setDraft(toLocalInputValue(preset.minutesAhead ? minutesFromNow(preset.minutesAhead) : tomorrowAt(preset.hour!)))
              }
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex justify-end gap-4 pt-4 text-sm">
        <button type="button" className="cursor-pointer font-medium text-ink" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-full border border-brand px-4 py-1 font-medium text-brand hover:bg-brand-soft"
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
