"use client";

import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { Label } from "./Label";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  mono?: boolean;
  focused?: boolean;
  suffix?: ReactNode;
}

export function Input({
  label,
  mono = false,
  focused = false,
  suffix,
  style,
  ...rest
}: InputProps) {
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    paddingRight: suffix ? 48 : 14,
    border: focused
      ? "1.5px solid var(--ignite)"
      : "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--surface)",
    color: "var(--fg)",
    fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
    fontSize: 16,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 120ms",
    ...style,
  };

  return (
    <div>
      {label && <Label style={{ marginBottom: 6 }}>{label}</Label>}
      <div style={{ position: "relative" }}>
        <input
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--ignite)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = focused
              ? "var(--ignite)"
              : "var(--border)";
          }}
          {...rest}
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-3)",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
