import type { ReactNode } from "react";
import { Label } from "@/components/primitives";

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function ComingSoon({ eyebrow, title, description, children }: ComingSoonProps) {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 32px" }}>
      <Label>{eyebrow}</Label>
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 48,
          fontWeight: 700,
          margin: "8px 0 12px",
          color: "var(--bone)",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--fg-3)",
          fontSize: 16,
          maxWidth: 560,
        }}
      >
        {description}
      </p>
      {children}
    </div>
  );
}
