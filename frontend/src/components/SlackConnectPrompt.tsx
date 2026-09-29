import { useEffect } from 'react';
import { Button } from './ui';
import { SlackIcon } from './icons';

type Props = {
  onDismiss: () => void;
  onConnect: () => void;
};

export function SlackConnectPrompt({ onDismiss, onConnect }: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onDismiss]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={onDismiss} />
      <div
        role="dialog"
        aria-labelledby="slack-connect-title"
        className="fixed left-1/2 top-1/2 z-50 flex w-[318px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[10px] border border-border bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center gap-2.5">
          <SlackIcon className="shrink-0" />
          <p id="slack-connect-title" className="text-sm font-semibold text-ink">
            Connect Slack
          </p>
        </div>
        <p className="mt-3 text-sm leading-[140%] text-muted">
          Connect Slack to get alerts when your hourly email limit is reached.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onDismiss} className="cursor-pointer text-sm font-medium text-ink">
            OK
          </button>
          <Button type="button" onClick={onConnect}>
            Connect Slack
          </Button>
        </div>
      </div>
    </>
  );
}
