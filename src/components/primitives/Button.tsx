"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "dark"
  | "ghost"
  | "ghostLight"
  | "text"
  | "pulse"
  | "strava"
  | "outline";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--ignite)",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(255,104,0,0.28)",
  },
  dark: { background: "var(--ink)", color: "var(--bone)" },
  ghost: {
    background: "transparent",
    color: "var(--bone)",
    border: "1.5px solid var(--ink-3)",
  },
  ghostLight: {
    background: "transparent",
    color: "var(--ink)",
    border: "1.5px solid var(--border-strong)",
  },
  text: { background: "transparent", color: "var(--fg-3)" },
  pulse: { background: "var(--pulse)", color: "var(--ink)", fontWeight: 700 },
  strava: {
    background: "#FC4C02",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(252,76,2,0.28)",
  },
  outline: {
    background: "transparent",
    color: "var(--ignite)",
    border: "1.5px solid var(--ignite)",
  },
};

function basePadding(variant: ButtonVariant, size: ButtonSize): string {
  if (variant === "ghost" || variant === "ghostLight") {
    return size === "lg" ? "12.5px 24px" : "9.5px 18px";
  }
  if (size === "sm") return "7px 12px";
  if (size === "lg") return "14px 26px";
  return "11px 20px";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  style,
  disabled,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const baseStyle: CSSProperties = {
    padding: basePadding(variant, size),
    fontSize: size === "sm" ? 12 : size === "lg" ? 16 : 14,
    fontWeight: 600,
    borderRadius: size === "lg" ? 12 : 10,
    border: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-body)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: disabled ? 0.5 : 1,
    transition:
      "transform 120ms var(--ease-snap), background 120ms, box-shadow 120ms, border-color 120ms",
  };

  return (
    <button
      disabled={disabled}
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
        onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(1)";
        onMouseUp?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(1)";
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
