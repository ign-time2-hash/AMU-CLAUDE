export function AmuLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AMU"
    >
      <rect width="48" height="48" rx="12" fill="#3F7D3A" />
      {/* Letter A */}
      <path d="M14 34L21 14H27L34 34H29L27.5 29.5H20.5L19 34H14Z" fill="white" />
      <path d="M21.8 26H26.2L24 19.5L21.8 26Z" fill="#3F7D3A" />
      {/* Lock icon inside the A */}
      <rect x="20.5" y="24" width="7" height="6" rx="1.5" fill="white" opacity="0.9" />
      <path d="M21.5 24V22.5C21.5 21.12 22.62 20 24 20C25.38 20 26.5 21.12 26.5 22.5V24" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9" />
      <circle cx="24" cy="27" r="1" fill="#3F7D3A" />
    </svg>
  );
}

export function AmuLogoText({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold text-primary text-xl tracking-tight">AMU</span>
      <span className="text-xs text-muted-foreground ml-1">Kronus</span>
    </span>
  );
}
