import type { CSSProperties } from "react";

export interface StepProgressProps {
  current: number;
  total: number;
  accent: string;
}

const dotStyle: CSSProperties = {
  width: 28,
  height: 4,
  borderRadius: 4,
  transition: "background 200ms",
};

export function StepProgress({ current, total, accent }: StepProgressProps) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            ...dotStyle,
            background: i <= current ? accent : "var(--bone-3)",
          }}
        />
      ))}
    </div>
  );
}
