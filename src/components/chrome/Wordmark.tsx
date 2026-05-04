import Link from "next/link";
import type { ReactNode } from "react";
import { Monogram } from "./Monogram";

interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  accent?: string;
  href?: string;
  tone?: "light" | "dark";
}

const SIZE_CONFIG = {
  sm: { mark: 26, text: 24 },
  md: { mark: 32, text: 28 },
  lg: { mark: 40, text: 36 },
} as const;

export function Wordmark({
  size = "sm",
  accent = "var(--ignite)",
  href,
  tone = "light",
}: WordmarkProps) {
  const { mark, text } = SIZE_CONFIG[size];
  const inner: ReactNode = (
    <>
      <Monogram size={mark} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: text,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        RUNSTATS<span style={{ color: accent }}>.</span>
      </span>
    </>
  );

  const wrapperStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: tone === "dark" ? "var(--ink)" : "var(--bone)",
    textDecoration: "none",
  } as const;

  if (href) {
    return (
      <Link href={href} style={wrapperStyle}>
        {inner}
      </Link>
    );
  }
  return <span style={wrapperStyle}>{inner}</span>;
}
