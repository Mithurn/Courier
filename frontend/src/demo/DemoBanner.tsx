import { exitDemo, isDemo } from './mode';

export function DemoBanner() {
  if (!isDemo()) return null;
  return (
    <div className="flex items-center justify-center gap-3 bg-ink px-4 py-2 text-xs text-white">
      <span>Demo mode: sample data, nothing is sent.</span>
      <button type="button" onClick={exitDemo} className="cursor-pointer rounded-full bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
        Exit demo
      </button>
    </div>
  );
}
