import { useState } from 'react';

const LABEL = 'Courier product tour: queue an email, set a pace, schedule it, and see rate limits and restarts handled';

// Click-to-load: until the visitor presses play only a small poster is downloaded and no <video> exists.
// AV1 first (smallest), H.264 as the fallback for browsers that cannot decode it.
export function ProductVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl border border-border bg-black shadow-2xl shadow-black/10">
      {playing ? (
        <video className="absolute inset-0 h-full w-full" controls autoPlay playsInline aria-label={LABEL}>
          <source src="/media/courier-ad-av1.mp4" type='video/mp4; codecs="av01.0.05M.08"' />
          <source src="/media/courier-ad-h264.mp4" type="video/mp4" />
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play the Courier product tour"
          className="group absolute inset-0 h-full w-full focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand"
        >
          <img src="/media/courier-ad-poster.webp" alt={LABEL} width={1280} height={720} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-black/35 via-transparent to-transparent">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/40 transition-transform duration-300 group-hover:scale-110 md:h-24 md:w-24">
              <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-current md:h-10 md:w-10" aria-hidden="true">
                <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10.4-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z" />
              </svg>
            </span>
            <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-ink backdrop-blur">Watch the 36 second tour</span>
          </span>
        </button>
      )}
    </div>
  );
}
