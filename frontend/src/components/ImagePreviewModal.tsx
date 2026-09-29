import { useCallback, useEffect, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

export function ImagePreviewModal({ src, alt, onClose }: Props) {
  const [scale, setScale] = useState(1);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [close]);

  function toggleZoom() {
    setScale((current) => (current === 1 ? 2 : 1));
  }

  function onWheel(event: React.WheelEvent) {
    event.preventDefault();
    setScale((current) => Math.min(3, Math.max(1, current + (event.deltaY < 0 ? 0.25 : -0.25))));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={close}>
      <button
        type="button"
        aria-label="Close preview"
        onClick={close}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => {
          e.stopPropagation();
          toggleZoom();
        }}
        onWheel={onWheel}
        className="max-h-[90vh] max-w-[90vw] cursor-zoom-in object-contain transition-transform duration-200"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}
