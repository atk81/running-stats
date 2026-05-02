"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Wordmark } from "@/components/chrome/Wordmark";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";
import { useUser } from "@/lib/hooks/useUser";

const dashboardLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "14px 26px",
  fontFamily: "var(--font-body)",
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 12,
  background: "var(--ignite)",
  color: "var(--accent-fg)",
  textDecoration: "none",
  boxShadow: "0 4px 16px rgba(255,104,0,0.28)",
} as const;

export function AuthedHome() {
  const { user, loading } = useUser();
  const handle = user?.handle ?? "";
  const accent = user?.accentColor || DEFAULT_ACCENT_COLOR;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ink)",
        color: "var(--bone)",
        display: "grid",
        placeItems: "center",
        padding: 48,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Wordmark size="md" accent={accent} />
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 72,
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
            margin: 0,
            color: "var(--bone)",
            fontWeight: 400,
          }}
        >
          YOU&apos;RE
          <br />
          <span style={{ color: accent }}>CONNECTED.</span>
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 16,
            color: "var(--fg-2)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {loading
            ? "Loading your profile…"
            : handle
              ? `Signed in as ${handle}.`
              : "Signed in."}
          <br />
          Dashboard, milestones and the share composer arrive in the next phases.
        </p>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Link href="/dashboard" style={dashboardLinkStyle}>
            Open dashboard
          </Link>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
