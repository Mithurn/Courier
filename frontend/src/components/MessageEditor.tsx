import { useEffect, useRef } from 'react';
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
  ChevronDownIcon,
  IndentIcon,
  ItalicIcon,
  OrderedListIcon,
  OutdentIcon,
  QuoteIcon,
  RedoIcon,
  StrikethroughIcon,
  UnderlineIcon,
  UndoIcon,
} from './icons';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const BLOCK_FORMATS = [
  { label: 'Normal', tag: 'p' },
  { label: 'Heading', tag: 'h2' },
  { label: 'Quote', tag: 'blockquote' },
];

function ToolbarButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-ink hover:bg-surface"
    >
      {children}
    </button>
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
    <div className="flex w-full max-h-[475px] flex-col gap-[22px] rounded-[10px] bg-surface-soft p-4">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className="min-h-[140px] flex-1 overflow-y-auto text-base leading-[118%] tracking-[-0.5px] text-ink outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]"
      />
      <div className="flex w-full shrink-0 flex-wrap items-center gap-4 rounded-full bg-white px-3 py-1.5 shadow-sm">
        <ToolbarButton label="Undo" onClick={() => exec('undo')}>
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => exec('redo')}>
          <RedoIcon />
        </ToolbarButton>
        <span className="h-4 w-px bg-divider" />
        <div className="relative flex items-center">
          <select
            aria-label="Text style"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => exec('formatBlock', e.target.value)}
            defaultValue="p"
            className="h-7 appearance-none rounded bg-transparent pr-4 text-xs text-ink focus:outline-none"
          >
            {BLOCK_FORMATS.map((f) => (
              <option key={f.tag} value={f.tag}>
                {f.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-0 text-icon" />
        </div>
        <span className="h-4 w-px bg-divider" />
        <ToolbarButton label="Bold" onClick={() => exec('bold')}>
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec('italic')}>
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec('underline')}>
          <UnderlineIcon />
        </ToolbarButton>
        <span className="h-4 w-px bg-divider" />
        <ToolbarButton label="Align left" onClick={() => exec('justifyLeft')}>
          <AlignLeftIcon />
        </ToolbarButton>
        <ToolbarButton label="Align center" onClick={() => exec('justifyCenter')}>
          <AlignCenterIcon />
        </ToolbarButton>
        <ToolbarButton label="Align right" onClick={() => exec('justifyRight')}>
          <AlignRightIcon />
        </ToolbarButton>
        <span className="h-4 w-px bg-divider" />
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
        <span className="h-4 w-px bg-divider" />
        <ToolbarButton label="Quote" onClick={() => exec('formatBlock', 'blockquote')}>
          <QuoteIcon />
        </ToolbarButton>
        <ToolbarButton label="Justify" onClick={() => exec('justifyFull')}>
          <AlignJustifyIcon />
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" onClick={() => exec('strikeThrough')}>
          <StrikethroughIcon />
        </ToolbarButton>
      </div>
    </div>
  );
}
