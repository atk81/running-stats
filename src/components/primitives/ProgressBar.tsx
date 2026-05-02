import type { CSSProperties, HTMLAttributes } from "react";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
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
  style,
  ...rest
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const trackStyle: CSSProperties = {
    height,
    borderRadius: 999,
    background: bg,
    overflow: "hidden",
    ...style,
  };
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      style={trackStyle}
      {...rest}
    >
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
