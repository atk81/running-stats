export interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  bg?: string;
}

export function ProgressBar({
  value,
  color = "var(--ignite)",
  height = 6,
  bg = "var(--ink-3)",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div style={{ height, borderRadius: 999, background: bg, overflow: "hidden" }}>
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          background: color,
          transition: "width 800ms var(--ease-out)",
        }}
      />
    </div>
  );
}
