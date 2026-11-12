// Minimal, consistent line icons (1.5px stroke). No icon library dependency.

type IconProps = { className?: string };

function base(className?: string) {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

/**
 * The Linger mark: two outlined bars that interlock into an "L".
 * Draws in currentColor, so wrap it in a tile (bg-ink text-surface) or colour it directly.
 * Keep geometry in sync with app/icon.svg.
 */
export function LingerMark({ className }: IconProps) {
  return (
    <svg
      viewBox="826 328 429 497"
      fill="none"
      stroke="currentColor"
      strokeWidth={42}
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
    >
      <path d="M847 349H973V676H957A110 110 0 0 1 847 566Z" />
      <path d="M974 678H1234V804H1100A126 126 0 0 1 974 678Z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
  );
}

export function SpinnerIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} className={`animate-spin ${className ?? ""}`}>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" opacity="0.9" />
    </svg>
  );
}

export function DragHandleIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 8h16M4 12h16M4 16h16" />
    </svg>
  );
}

export function MoreIcon({ className }: IconProps) {
  // Horizontal "…" — fills, not strokes, so it reads as solid dots.
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function ShoppingCartIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3 4h2l2.3 11.4a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L20 7.5H6.2" />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="20" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export function FlagIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 21V4M5 4h11l-1.5 4L16 12H5" />
    </svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.4" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
