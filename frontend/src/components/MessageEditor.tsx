import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenterIcon,
  AlignHorizontalIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
  ChevronSortIcon,
  IndentIcon,
  ItalicIcon,
  OrderedListIcon,
  OutdentIcon,
  QuoteIcon,
  RedoIcon,
  StrikethroughIcon,
  TextFormatIcon,
  UnderlineIcon,
  UndoIcon,
} from './icons';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const BLOCK_FORMATS = [
  { value: 'p', label: 'Normal', Icon: TextFormatIcon },
  { value: 'h2', label: 'Heading', Icon: TextFormatIcon },
  { value: 'blockquote', label: 'Quote', Icon: TextFormatIcon },
];

const ALIGNMENTS = [
  { value: 'justifyLeft', label: 'Align left', Icon: AlignLeftIcon },
  { value: 'justifyCenter', label: 'Align center', Icon: AlignCenterIcon },
  { value: 'justifyRight', label: 'Align right', Icon: AlignRightIcon },
];

function ToolbarButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-icon-muted hover:bg-surface hover:text-ink"
    >
      {children}
    </button>
  );
}

function ToolbarDropdown<T extends string>({
  label,
  trigger,
  options,
  onSelect,
}: {
  label: string;
  trigger: ReactNode;
  options: { value: T; label: string; Icon: (props: { className?: string }) => ReactNode }[];
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 shrink-0 items-center gap-1 rounded px-1 text-icon-muted hover:bg-surface hover:text-ink"
      >
        {trigger}
        <ChevronSortIcon className="h-3 w-3 text-icon-muted" />
      </button>
      {open &&
        menuPos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
            <div
              style={menuPos}
              className="fixed z-50 flex min-w-[140px] flex-col gap-0.5 rounded-lg border border-border bg-white p-1 text-sm shadow-sm"
            >
              {options.map(({ value, label: optionLabel, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-ink hover:bg-surface"
                >
                  <Icon className="h-4 w-4 shrink-0 text-icon" />
                  {optionLabel}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

export function MessageEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // contentEditable is inherently uncontrolled; only seed initial content once.
  useEffect(() => {
    if (ref.current && value) ref.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? '');
  }

  return (
    <div className="flex min-h-[260px] max-h-[475px] w-full flex-col gap-[22px] rounded-[10px] bg-surface-soft p-4">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className="max-h-[377px] overflow-y-auto text-base leading-[118%] tracking-[-0.5px] text-ink outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]"
      />
      <div className="flex w-full shrink-0 flex-nowrap items-center gap-4 overflow-x-auto rounded-full bg-white px-3 py-1.5 shadow-sm [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        <ToolbarButton label="Undo" onClick={() => exec('undo')}>
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => exec('redo')}>
          <RedoIcon />
        </ToolbarButton>
        <span className="h-4 w-px shrink-0 bg-divider" />
        <ToolbarDropdown
          label="Text style"
          trigger={<TextFormatIcon />}
          options={BLOCK_FORMATS}
          onSelect={(tag) => exec('formatBlock', tag)}
        />
        <span className="h-4 w-px shrink-0 bg-divider" />
        <ToolbarButton label="Bold" onClick={() => exec('bold')}>
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec('italic')}>
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec('underline')}>
          <UnderlineIcon />
        </ToolbarButton>
        <span className="h-4 w-px shrink-0 bg-divider" />
        <ToolbarDropdown
          label="Alignment"
          trigger={<AlignCenterIcon />}
          options={ALIGNMENTS}
          onSelect={(command) => exec(command)}
        />
        <span className="h-4 w-px shrink-0 bg-divider" />
        <ToolbarButton label="Numbered list" onClick={() => exec('insertOrderedList')}>
          <OrderedListIcon />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" onClick={() => exec('insertUnorderedList')}>
          <BulletListIcon />
        </ToolbarButton>
        <ToolbarButton label="Indent" onClick={() => exec('indent')}>
          <IndentIcon />
        </ToolbarButton>
        <ToolbarButton label="Outdent" onClick={() => exec('outdent')}>
          <OutdentIcon />
        </ToolbarButton>
        <ToolbarButton label="Quote" onClick={() => exec('formatBlock', 'blockquote')}>
          <QuoteIcon />
        </ToolbarButton>
        <ToolbarButton label="Justify" onClick={() => exec('justifyFull')}>
          <AlignHorizontalIcon />
        </ToolbarButton>
        <span className="h-4 w-px shrink-0 bg-divider" />
        <ToolbarButton label="Strikethrough" onClick={() => exec('strikeThrough')}>
          <StrikethroughIcon />
        </ToolbarButton>
      </div>
    </div>
  );
}
