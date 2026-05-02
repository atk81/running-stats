import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export interface LabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const baseStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "var(--fg-3)",
};

export function Label({ children, style, ...rest }: LabelProps) {
  return (
    <div style={{ ...baseStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}
