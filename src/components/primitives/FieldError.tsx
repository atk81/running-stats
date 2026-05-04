import type { CSSProperties, ReactNode } from "react";

export interface FieldErrorProps {
  children: ReactNode;
  style?: CSSProperties;
}

const baseStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ignite-deep)",
};

export function FieldError({ children, style }: FieldErrorProps) {
  return (
    <div role="alert" style={{ ...baseStyle, ...style }}>
      {children}
    </div>
  );
}
