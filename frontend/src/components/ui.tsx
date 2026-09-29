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

export function Toast({
  message,
  variant = 'info',
  duration,
  onDismiss,
}: {
  message: string;
  variant?: 'success' | 'error' | 'info' | 'scheduled';
  duration?: number;
  onDismiss: () => void;
}) {
  const timeoutMs = duration ?? (variant === 'scheduled' ? 2000 : 4500);

  useEffect(() => {
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [onDismiss, timeoutMs]);

  const variantStyles = {
    scheduled: 'bg-[#EA580C] text-white shadow-orange-950/25',
    success: 'bg-[#00A63E] text-white shadow-emerald-950/25',
    error: 'bg-rose-600 text-white shadow-rose-950/25',
    info: 'bg-ink text-white shadow-black/25',
  }[variant];

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${variantStyles}`}
    >
      {variant === 'scheduled' && (
        <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {variant === 'success' && (
        <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {variant === 'error' && (
        <svg className="h-5 w-5 shrink-0 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="cursor-pointer text-white/70 hover:text-white" aria-label="Dismiss">
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
