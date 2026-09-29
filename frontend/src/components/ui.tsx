import { useEffect } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const styles =
    variant === 'primary' ? 'bg-brand text-white hover:opacity-90' : 'border border-brand text-brand hover:bg-brand-soft';
  return (
    <button
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-lg">
      <span>{message}</span>
      <button onClick={onDismiss} className="text-white/60 hover:text-white" aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 font-bold">
        ×
      </button>
    </div>
  );
}
