"use client";

import { Button, Icon } from "@/components/primitives";

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--fg-3)",
        minHeight: "calc(100vh - 56px)",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

export interface PageErrorProps {
  title: string;
  description?: string;
  onRetry: () => void;
}

export function PageError({ title, description, onRetry }: PageErrorProps) {
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--bone)",
        minHeight: "calc(100vh - 56px)",
        display: "grid",
        placeItems: "center",
        padding: 32,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: "var(--fg-3)",
              marginBottom: 18,
            }}
          >
            {description}
          </div>
        )}
        <Button variant="primary" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Retry
        </Button>
      </div>
    </div>
  );
}
