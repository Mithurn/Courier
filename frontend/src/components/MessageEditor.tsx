import { useEffect, useRef } from 'react';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
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

const FONT_SIZES = [
  { label: 'Small', size: '2' },
  { label: 'Normal', size: '3' },
  { label: 'Large', size: '5' },
];

function ToolbarButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink hover:bg-surface"
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
    <div className="rounded-lg bg-surface p-4">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        data-placeholder={placeholder}
        className="min-h-6 text-sm text-ink outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-sm">
        <ToolbarButton label="Undo" onClick={() => exec('undo')}>
          <UndoIcon />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => exec('redo')}>
          <RedoIcon />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-divider" />
        <select
          aria-label="Font size"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => exec('fontSize', e.target.value)}
          defaultValue="3"
          className="h-7 rounded border-none bg-transparent text-xs text-ink focus:outline-none"
        >
          {FONT_SIZES.map((f) => (
            <option key={f.size} value={f.size}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="mx-1 h-4 w-px bg-divider" />
        <ToolbarButton label="Bold" onClick={() => exec('bold')}>
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec('italic')}>
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec('underline')}>
          <UnderlineIcon />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-divider" />
        <ToolbarButton label="Align left" onClick={() => exec('justifyLeft')}>
          <AlignLeftIcon />
        </ToolbarButton>
        <ToolbarButton label="Align center" onClick={() => exec('justifyCenter')}>
          <AlignCenterIcon />
        </ToolbarButton>
        <ToolbarButton label="Align right" onClick={() => exec('justifyRight')}>
          <AlignRightIcon />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-divider" />
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
        <span className="mx-1 h-4 w-px bg-divider" />
        <ToolbarButton label="Quote" onClick={() => exec('formatBlock', 'blockquote')}>
          <QuoteIcon />
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" onClick={() => exec('strikeThrough')}>
          <StrikethroughIcon />
        </ToolbarButton>
      </div>
    </div>
  );
}
