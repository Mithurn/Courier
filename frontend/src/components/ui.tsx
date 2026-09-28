import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const styles =
    variant === 'primary'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'border border-green-600 text-green-700 hover:bg-green-50';
  return (
    <button
      className={`rounded-full px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-8 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-500 hover:text-gray-800" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
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
