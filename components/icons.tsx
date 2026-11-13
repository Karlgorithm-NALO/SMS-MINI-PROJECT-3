// One stroke-based icon set, so every glyph on the page shares a weight and style.

type IconProps = { className?: string };

function Icon({ className = "h-4 w-4", viewBox = "0 0 16 16", strokeWidth = 1.6, children }: IconProps & { viewBox?: string; strokeWidth?: number; children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={2.2}>
    <path d="m3.5 8.5 3 3 6-7" />
  </Icon>
);

export const XCircleIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={1.8}>
    <circle cx="8" cy="8" r="6" />
    <path d="m6 6 4 4m0-4-4 4" />
  </Icon>
);

export const AlertIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={1.8}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3.5M8 11v.01" />
  </Icon>
);

export const WalletXIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={1.8}>
    <path d="M2.5 5c0-.8.7-1.5 1.5-1.5h7.5V6M2.5 5v6.5c0 .8.7 1.5 1.5 1.5h9V6H4c-.8 0-1.5-.2-1.5-1z" />
    <path d="m8 8.25 2.5 2.5m0-2.5L8 10.75" />
  </Icon>
);

export const FileXIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={1.7}>
    <path d="M4 1.75h5.5L12.5 4.75V14.25H4z" />
    <path d="m6.5 8.25 3 3m0-3-3 3" />
  </Icon>
);

export const WalletIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 20 20">
    <path d="M3.25 6.25c0-1.1.9-2 2-2h9.5v3M3.25 6.25v8.5c0 1.1.9 2 2 2h11.5v-9.5H5.25a2 2 0 0 1-2-1z" />
    <circle cx="13.5" cy="12" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

export const UploadIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5M5 14.5v4.25c0 .69.56 1.25 1.25 1.25h11.5c.69 0 1.25-.56 1.25-1.25V14.5" />
  </Icon>
);

export const DownloadIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M8 2.5v8M4.75 7.5 8 10.75l3.25-3.25M2.75 12.5v.75c0 .41.34.75.75.75h9c.41 0 .75-.34.75-.75v-.75" />
  </Icon>
);

export const SheetIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.7}>
    <path d="M6 2.75h8.25L18.75 7.25V21.25H6z" />
    <path d="M14 2.75V7.5h4.75M9 11.5h6.5M9 14.75h6.5M9 18h4" />
  </Icon>
);

export const ArrowRightIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 20 20" strokeWidth={2}>
    <path d="M3.5 10h12.5M11 5l5 5-5 5" />
  </Icon>
);

export const ArrowDownIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={2}>
    <path d="M8 3v10M4 9l4 4 4-4" />
  </Icon>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={1.8}>
    <path d="m4 6 4 4 4-4" />
  </Icon>
);

export const TableIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 20 20" strokeWidth={1.6}>
    <rect x="3" y="3.5" width="14" height="13" rx="2" />
    <path d="M3 8h14M3 12.25h14M8 8v8.5" />
  </Icon>
);

export const RepeatIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M11.5 2.5 13.5 4.5l-2 2M13.5 4.5h-8a3 3 0 0 0-3 3M4.5 13.5l-2-2 2-2M2.5 11.5h8a3 3 0 0 0 3-3" />
  </Icon>
);

export const ClockIcon = ({ className }: IconProps) => (
  <Icon className={className} strokeWidth={1.5}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.75V8l2.25 1.5" />
  </Icon>
);

export const PaperPlaneIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Icon>
);

export const RefreshIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </Icon>
);

export const PhoneIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);

export const MessageSquareIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const CopyIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const SignalIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M2 20h.01" />
    <path d="M7 20v-4" />
    <path d="M12 20v-8" />
    <path d="M17 20V8" />
    <path d="M22 4v16" />
  </Icon>
);

export const WebhookIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M18 16.98h4v5h-4z" />
    <path d="M2 16.98h4v5H2z" />
    <path d="M10 2.02h4v5h-4z" />
    <path d="m14 7.02 4 9.96" />
    <path d="M6 16.98 10 7.02" />
  </Icon>
);

export const CoinsIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="m16.71 13.88.7.71-2.82 2.82" />
  </Icon>
);

export const ZapIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={2}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Icon>
);

export const SendIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={2}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icon>
);

export const SparklesIcon = ({ className }: IconProps) => (
  <Icon className={className} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </Icon>
);

export const SpinnerIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <svg aria-hidden viewBox="0 0 16 16" fill="none" className={`shrink-0 motion-safe:animate-spin ${className}`}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
    <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** The SikaLedger mark: a ledger page with its margin rule, on brand orange. */
export function LogoMark({ className = "h-9 w-9" }: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 36 36" className={`shrink-0 ${className}`}>
      <rect width="36" height="36" rx="10" className="fill-accent" />
      <rect x="9" y="8" width="3.5" height="20" rx="1.75" fill="#FFFFFF" />
      <rect x="16" y="10" width="11" height="3" rx="1.5" fill="#FFFFFF" />
      <rect x="16" y="16.5" width="11" height="3" rx="1.5" fill="#FFFFFF" />
      <rect x="16" y="23" width="7" height="3" rx="1.5" fill="#FFFFFF" />
    </svg>
  );
}

/** The same mark drawn as a faint emblem on the balance card. */
export function Emblem({ className }: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 300 300" className={className}>
      <rect x="40" y="20" width="34" height="240" rx="17" fill="#FFFFFF" />
      <rect x="110" y="50" width="160" height="34" rx="17" fill="#FFFFFF" />
      <rect x="110" y="130" width="160" height="34" rx="17" fill="#FFFFFF" />
      <rect x="110" y="210" width="100" height="34" rx="17" fill="#FFFFFF" />
    </svg>
  );
}

/** Ghana National Flag with central black star */
export function GhanaFlag({ className = "h-4 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 24"
      className={`shrink-0 overflow-hidden rounded-sm shadow-xs ${className}`}
      aria-label="Ghana Flag"
    >
      <rect width="36" height="8" fill="#CE1126" />
      <rect y="8" width="36" height="8" fill="#FCD116" />
      <rect y="16" width="36" height="8" fill="#006B3F" />
      <polygon
        points="18,8.2 19.3,11.8 23.2,11.8 20.1,14.1 21.3,17.7 18,15.4 14.7,17.7 15.9,14.1 12.8,11.8 16.7,11.8"
        fill="#000000"
      />
    </svg>
  );
}

/** Official MTN Ghana Brandmark Logo */
export function MtnLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`shrink-0 overflow-hidden rounded-md shadow-xs ${className}`}
      aria-label="MTN Ghana"
    >
      <rect width="32" height="32" rx="6" fill="#FFCC00" />
      <ellipse cx="16" cy="16" rx="12.5" ry="8" fill="none" stroke="#001C38" strokeWidth="1.6" />
      {/* 'M' */}
      <path
        d="M 8.5 19.5 V 12.5 L 11 16.5 L 13.5 12.5 V 19.5"
        fill="none"
        stroke="#001C38"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 'T' */}
      <path
        d="M 14.5 12.5 H 18.5 M 16.5 12.5 V 19.5"
        fill="none"
        stroke="#001C38"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 'N' */}
      <path
        d="M 19.5 19.5 V 12.5 L 23.5 19.5 V 12.5"
        fill="none"
        stroke="#001C38"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Official Telecel Ghana Brandmark Logo */
export function TelecelLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`shrink-0 overflow-hidden rounded-md shadow-xs ${className}`}
      aria-label="Telecel Ghana"
    >
      <rect width="32" height="32" rx="6" fill="#E60000" />
      <path
        d="M 16 6.5 C 10.75 6.5 6.5 10.75 6.5 16 C 6.5 21.25 10.75 25.5 16 25.5 C 21.25 25.5 25.5 21.25 25.5 16 C 25.5 12.2 23.2 8.9 20 7.4"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 16 11.5 C 13.5 11.5 11.5 13.5 11.5 16 C 11.5 18.5 13.5 20.5 16 20.5 C 18.5 20.5 20.5 18.5 20.5 16"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
    </svg>
  );
}

/** Official AT Ghana Brandmark Logo (formerly AirtelTigo) */
export function AtLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`shrink-0 overflow-hidden rounded-md border border-slate-200/80 shadow-xs ${className}`}
      aria-label="AT Ghana"
    >
      <rect width="32" height="32" rx="6" fill="#FFFFFF" />
      {/* 'a' in Royal Blue */}
      <circle cx="11.5" cy="16.5" r="4" fill="none" stroke="#005BA6" strokeWidth="2.4" />
      <path d="M 15.5 12.5 V 20.5" stroke="#005BA6" strokeWidth="2.4" strokeLinecap="round" />
      {/* 't' in Vibrant Red */}
      <path
        d="M 19 10.5 V 18 C 19 19.8 20 20.5 21.5 20.5"
        stroke="#EE3124"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 17 13.5 H 22" stroke="#EE3124" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Unified Telco Logo dispatcher */
export function TelcoLogo({
  carrier,
  className = "h-4 w-4",
}: {
  carrier?: string | null;
  className?: string;
}) {
  const norm = carrier?.trim().toLowerCase();
  if (norm === "mtn") {
    return <MtnLogo className={className} />;
  }
  if (norm === "telecel" || norm === "vodafone") {
    return <TelecelLogo className={className} />;
  }
  if (norm === "at" || norm === "airteltigo" || norm === "tigo" || norm === "airtel") {
    return <AtLogo className={className} />;
  }
  if (norm === "ghana") {
    return <GhanaFlag className={className} />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-ink-soft ${className}`}
      aria-label="Network"
    >
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 20V4" />
    </svg>
  );
}
