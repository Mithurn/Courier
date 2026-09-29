type IconProps = { className?: string };

/** Renders Carbon Design System glyphs (32x32 viewBox, filled paths) — used for the message toolbar icon set. */
function CarbonIcon({ paths, className = '' }: IconProps & { paths: string[] }) {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function SearchIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M14 14 11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function FilterIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 3h12l-4.5 5.5V13l-3 1.5V8.5L2 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.88M13.5 2v3h-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MenuIcon({ className = '' }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon({ className = '' }: IconProps) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScheduledClockIcon({ active = false, className = '' }: IconProps & { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <g className={active ? 'origin-[8px_8px] animate-clock-tick' : undefined}>
        <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function BackIcon({ className = '' }: IconProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M12.5 15 7.5 10l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UploadIcon({ className = '' }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 10.5V2.5M8 2.5 5 5.5M8 2.5l3 3M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 1.5l1.98 4.16 4.52.58-3.34 3.19.86 4.57L8 11.84l-4.02 2.16.86-4.57L1.5 6.24l4.52-.58L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AttachmentIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M11 5.5 6.7 9.8a1.9 1.9 0 1 0 2.7 2.7l4.3-4.3a3.2 3.2 0 1 0-4.5-4.5L4.9 8a4.5 4.5 0 1 0 6.4 6.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ArchiveIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="3" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 6.5V12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6.5M6.5 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5V13a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V4.5M6.7 7.3v4M9.3 7.3v4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDownIcon({ className = '' }: IconProps) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UndoIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M20,10H7.8149l3.5874-3.5859L10,5,4,11,10,17l1.4023-1.4146L7.8179,12H20a6,6,0,0,1,0,12H12v2h8a8,8,0,0,0,0-16Z']}
    />
  );
}

export function RedoIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M12,10H24.1851L20.5977,6.4141,22,5,28,11,22,17l-1.4023-1.4146L24.1821,12H12a6,6,0,0,0,0,12h8v2H12a8,8,0,0,1,0-16Z']}
    />
  );
}

export function BoldIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M18.25,25H9V7h8.5a5.25,5.25,0,0,1,4,8.65A5.25,5.25,0,0,1,18.25,25ZM12,22h6.23a2.25,2.25,0,1,0,0-4.5H12Zm0-7.5h5.5a2.25,2.25,0,1,0,0-4.5H12Z']}
    />
  );
}

export function ItalicIcon({ className = '' }: IconProps) {
  return <CarbonIcon className={className} paths={['M25 9 25 7 12 7 12 9 17.14 9 12.77 23 7 23 7 25 20 25 20 23 14.86 23 19.23 9 25 9z']} />;
}

export function UnderlineIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M4 26H28V28H4z', 'M16,23a7,7,0,0,1-7-7V5h2V16a5,5,0,0,0,10,0V5h2V16A7,7,0,0,1,16,23Z']}
    />
  );
}

export function StrikethroughIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={[
        'M28,15H17.9563c-.4522-.1237-.9037-.2324-1.3381-.3352-2.8077-.6641-4.396-1.1506-4.396-3.4231a2.8684,2.8684,0,0,1,.7866-2.145,4.7888,4.7888,0,0,1,3.0137-1.09c2.8291-.07,4.1347.8894,5.2011,2.35l1.6153-1.1792a7.4727,7.4727,0,0,0-6.83-3.1706,6.7726,6.7726,0,0,0-4.4,1.6611,4.8274,4.8274,0,0,0-1.3862,3.5735A4.3723,4.3723,0,0,0,11.9573,15H4v2H17.6519c1.9668.57,3.1432,1.3123,3.1733,3.3579a3.119,3.119,0,0,1-.8623,2.3931A5.8241,5.8241,0,0,1,16.2432,24a6.6344,6.6344,0,0,1-5.1451-2.6912L9.5649,22.593A8.5262,8.5262,0,0,0,16.2119,26c.0088-.0012.042,0,.1,0A7.67,7.67,0,0,0,21.36,24.1812a5.0779,5.0779,0,0,0,1.4648-3.8531A4.952,4.952,0,0,0,21.6753,17H28Z',
      ]}
    />
  );
}

export function TextFormatIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M23 27 23 15 18 15 18 13 30 13 30 15 25 15 25 27 23 27z', 'M11 27 11 8 2 8 2 6 22 6 22 8 13 8 13 27 11 27z']}
    />
  );
}

export function ChevronSortIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M16 28 9 21 10.41 19.59 16 25.17 21.59 19.59 23 21 16 28z', 'M16 4 23 11 21.59 12.41 16 6.83 10.41 12.41 9 11 16 4z']}
    />
  );
}

export function AlignLeftIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M12 6H26V8H12z', 'M12 12H22V14H12z', 'M12 18H26V20H12z', 'M12 24H22V26H12z', 'M6 4H8V28H6z']}
    />
  );
}

export function AlignCenterIcon({ className = '' }: IconProps) {
  return <CarbonIcon className={className} paths={['M6 6H26V8H6z', 'M10 12H22V14H10z', 'M6 18H26V20H6z', 'M10 24H22V26H10z']} />;
}

export function AlignRightIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={['M6 6H20V8H6z', 'M10 12H20V14H10z', 'M6 18H20V20H6z', 'M10 24H20V26H10z', 'M24 4H26V28H24z']}
    />
  );
}

export function AlignJustifyIcon({ className = '' }: IconProps) {
  return <CarbonIcon className={className} paths={['M6 6H26V8H6z', 'M6 12H26V14H6z', 'M6 18H26V20H6z', 'M6 24H26V26H6z']} />;
}

export function AlignHorizontalIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={[
        'M26,26H11a2.0023,2.0023,0,0,1-2-2V20a2.0023,2.0023,0,0,1,2-2H26a2.0023,2.0023,0,0,1,2,2v4A2.0023,2.0023,0,0,1,26,26Zm0-6.0012L11,20v4H26Z',
        'M18,14H11a2.0023,2.0023,0,0,1-2-2V8a2.0023,2.0023,0,0,1,2-2h7a2.0023,2.0023,0,0,1,2,2v4A2.0023,2.0023,0,0,1,18,14Zm0-6.0012L11,8v4h7Z',
        'M4 2H6V30H4z',
      ]}
    />
  );
}

export function OrderedListIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={[
        'M16 22H30V24H16z',
        'M16 8H30V10H16z',
        'M8 12 8 4 6 4 6 5 4 5 4 7 6 7 6 12 4 12 4 14 6 14 8 14 10 14 10 12 8 12z',
        'M10,28H4V24a2,2,0,0,1,2-2H8V20H4V18H8a2,2,0,0,1,2,2v2a2,2,0,0,1-2,2H6v2h4Z',
      ]}
    />
  );
}

export function BulletListIcon({ className = '' }: IconProps) {
  return <CarbonIcon className={className} paths={['M16 22H30V24H16z', 'M16 8H30V10H16z']} />;
}

export function IndentIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={[
        'M20 6H30V8H20z',
        'M20 12H27V14H20z',
        'M20 18H30V20H20z',
        'M20 24H27V26H20z',
        'M14 4H16V28H14z',
        'M3.85 22.5 2.44 21.12 8.73 15 2.44 8.88 3.85 7.5 11.56 15 3.85 22.5z',
      ]}
    />
  );
}

export function OutdentIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={[
        'M2 6H12V8H2z',
        'M5 12H12V14H5z',
        'M2 18H12V20H2z',
        'M5 24H12V26H5z',
        'M16 4H18V28H16z',
        'M28.15 23.5 29.56 22.12 23.27 16 29.56 9.88 28.15 8.5 20.44 16 28.15 23.5z',
      ]}
    />
  );
}

export function QuoteIcon({ className = '' }: IconProps) {
  return (
    <CarbonIcon
      className={className}
      paths={[
        'M12,15H6.11A9,9,0,0,1,10,8.86l1.79-1.2L10.69,6,8.9,7.2A11,11,0,0,0,4,16.35V23a2,2,0,0,0,2,2h6a2,2,0,0,0,2-2V17A2,2,0,0,0,12,15Z',
        'M26,15H20.11A9,9,0,0,1,24,8.86l1.79-1.2L24.7,6,22.9,7.2A11,11,0,0,0,18,16.35V23a2,2,0,0,0,2,2h6a2,2,0,0,0,2-2V17A2,2,0,0,0,26,15Z',
      ]}
    />
  );
}

export function SlackIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.6 9.4a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0ZM3.8 9.4a1.4 1.4 0 0 1 1.4-1.4h1.4V6.6a1.4 1.4 0 1 1 2.8 0v1.4h1.4a1.4 1.4 0 0 1 0 2.8H9.4v1.4a1.4 1.4 0 1 1-2.8 0V9.4H5.2Z"
        fill="#611F69"
      />
      <path
        d="M9.4 6.6a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0ZM12.2 6.6a1.4 1.4 0 0 1-1.4 1.4h-1.4v1.4a1.4 1.4 0 1 1-2.8 0V8H5.2a1.4 1.4 0 0 1 0-2.8h1.4V3.8a1.4 1.4 0 1 1 2.8 0v1.4h1.4a1.4 1.4 0 0 1 1.4 1.4Z"
        fill="#E01E5A"
      />
      <path
        d="M6.6 6.6a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0ZM3.8 6.6a1.4 1.4 0 0 1 1.4-1.4h1.4V3.8a1.4 1.4 0 1 1 2.8 0v1.4h1.4a1.4 1.4 0 0 1 0 2.8H9.4v1.4a1.4 1.4 0 1 1-2.8 0V6.6H5.2Z"
        fill="#36C5F0"
      />
      <path
        d="M9.4 9.4a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0ZM12.2 9.4a1.4 1.4 0 0 1-1.4-1.4h-1.4V6.6a1.4 1.4 0 1 1 2.8 0v1.4h1.4a1.4 1.4 0 0 1 0 2.8H9.4v1.4a1.4 1.4 0 1 1-2.8 0V9.4h1.4Z"
        fill="#2EB67D"
      />
    </svg>
  );
}

export function LogoutIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6M10 11l3-3-3-3M13 8H6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
