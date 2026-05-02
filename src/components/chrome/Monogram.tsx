interface MonogramProps {
  size?: number;
  title?: string;
}

export function Monogram({ size = 26, title = "" }: MonogramProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <rect width="32" height="32" rx="8" fill="var(--ink-2)" />
      <path
        d="M9 23 L9 9 L17 9 A6 6 0 0 1 17 21 L13 21 L13 23"
        stroke="var(--bone)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="23" r="2" fill="var(--ignite)" />
    </svg>
  );
}
