import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type PillTone =
  | "ink"
  | "ignite"
  | "igniteSolid"
  | "pulse"
  | "pulseSoft"
  | "amber"
  | "cyan"
  | "ghost"
  | "ghostLight";

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: PillTone;
}

const toneStyles: Record<PillTone, CSSProperties> = {
  ink: { background: "var(--ink)", color: "var(--bone)" },
  ignite: { background: "rgba(255,104,0,0.14)", color: "var(--ignite)" },
  igniteSolid: { background: "var(--ignite)", color: "#fff" },
  pulse: { background: "var(--pulse)", color: "var(--ink)" },
  pulseSoft: { background: "rgba(0,255,129,0.14)", color: "var(--pulse-deep)" },
  amber: { background: "rgba(255,169,0,0.14)", color: "var(--amber-deep)" },
  cyan: { background: "rgba(0,240,255,0.14)", color: "var(--cyan-deep)" },
  ghost: {
    background: "transparent",
    border: "1px solid var(--ink-3)",
    color: "var(--fg-3)",
    fontWeight: 500,
  },
  ghostLight: {
    background: "transparent",
    border: "1px solid var(--bone-3)",
    color: "var(--fg-3)",
    fontWeight: 500,
  },
};

const baseStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  fontFamily: "var(--font-body)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

export function Pill({ children, tone = "ink", style, ...rest }: PillProps) {
  return (
    <span style={{ ...baseStyle, ...toneStyles[tone], ...style }} {...rest}>
      {children}
    </span>
  );
}
