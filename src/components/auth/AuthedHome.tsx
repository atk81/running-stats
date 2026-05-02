"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/primitives";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";
import { useUser } from "@/lib/hooks/useUser";

const ACCENT = DEFAULT_ACCENT_COLOR;

export function AuthedHome() {
  const { user, loading } = useUser();
  const handle = user?.handle ?? "";
  const accent = user?.accentColor || ACCENT;

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/assets/monogram.svg" width={32} height={32} alt="" />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              letterSpacing: "-0.02em",
            }}
          >
            RUNSTATS<span style={{ color: accent }}>.</span>
          </span>
        </div>
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
          YOU'RE
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
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="lg">
              Open dashboard
            </Button>
          </Link>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
