import logo from '../assets/logo.webp';
import { liveAppUrl } from '../config';
import { enterDemo } from '../demo/mode';
import { FEATURES, SHOTS, STACK, STEPS } from './content';

const primaryButton =
  'inline-flex h-12 items-center justify-center rounded-full bg-brand px-7 text-sm font-medium text-white transition hover:opacity-90';
const ghostButton =
  'inline-flex h-12 items-center justify-center rounded-full border border-border px-7 text-sm font-medium text-ink transition hover:bg-surface';

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-black/5">
      <div className="flex items-center gap-1.5 border-b border-divider bg-surface-soft px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
      </div>
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2.5">
          <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-semibold">Courier</span>
        </a>
        <nav className="flex items-center gap-3">
          <button type="button" onClick={enterDemo} className="hidden text-sm font-medium text-muted hover:text-ink sm:block">
            Demo
          </button>
          <a href={liveAppUrl('/login')} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface">
            Open app
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 text-center sm:pt-20">
          <p className="mx-auto mb-5 w-fit rounded-full bg-brand-soft px-4 py-1.5 text-xs font-medium text-brand">
            Email scheduling that keeps its promises
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Send every email at the exact second you chose.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Courier schedules outbound email with delayed jobs, per-sender rate limits and zero duplicates, and picks up exactly where it left off after any restart.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={enterDemo} className={primaryButton}>
              Try the live demo
            </button>
            <a href={liveAppUrl('/login')} className={ghostButton}>
              Sign in with Google
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">The demo runs in your browser with sample data. No sign-in needed.</p>
          <div className="mx-auto mt-14 max-w-5xl">
            <BrowserFrame src={SHOTS[0].src} alt={SHOTS[0].alt} />
          </div>
        </section>

        <section className="bg-surface py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">Built to be boring in production</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">The hard parts of scheduled email, handled for you.</p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-border bg-white p-6">
                  <span className="mb-4 block h-2 w-8 rounded-full bg-brand" />
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-surface py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2">
            {SHOTS.slice(1).map((shot) => (
              <figure key={shot.src}>
                <BrowserFrame src={shot.src} alt={shot.alt} />
                <figcaption className="mt-4 text-center text-sm text-muted">{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Built with</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {STACK.map((tech) => (
              <span key={tech} className="rounded-full border border-border px-4 py-1.5 text-sm text-muted">
                {tech}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-3xl bg-brand-soft px-6 py-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">See it schedule, send and survive.</h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button type="button" onClick={enterDemo} className={primaryButton}>
                Try the live demo
              </button>
              <a href={liveAppUrl('/login')} className={`${ghostButton} bg-white`}>
                Open the real app
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">The real app runs on a server that sleeps when idle. If it is asleep, use the demo.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-divider py-8 text-center text-sm text-muted">Courier, an email scheduler by Mithurn Jeromme.</footer>
    </div>
  );
}
