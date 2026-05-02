"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Wordmark } from "@/components/chrome/Wordmark";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";
import { useUser } from "@/lib/hooks/useUser";

interface ChromeProps {
  children: ReactNode;
}

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "runs" },
  { href: "/goals", label: "goals" },
  { href: "/milestones", label: "milestones" },
  { href: "/events", label: "events" },
];

function getInitials(name: string | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLastSync(lastSyncAt: string | null | undefined): string {
  if (!lastSyncAt) return "not synced yet";
  const ms = Date.now() - Date.parse(lastSyncAt);
  if (Number.isNaN(ms)) return "not synced yet";
  if (ms < 60_000) return "synced · now";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `synced · ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `synced · ${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `synced · ${day}d ago`;
}

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  if (href === "/dashboard" && pathname === "/goals") return true;
  if (href === "/milestones" && pathname.startsWith("/milestone/")) return true;
  return false;
}

export function Chrome({ children }: ChromeProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const accent = user?.accentColor || DEFAULT_ACCENT_COLOR;
  const initials = getInitials(user?.name);
  const sync = formatLastSync(user?.lastSyncAt);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", color: "var(--bone)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          height: 56,
          background: "rgba(10,13,16,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--ink-3)",
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          gap: 40,
        }}
      >
        <Wordmark size="sm" accent={accent} href="/dashboard" />

        <nav style={{ display: "flex", gap: 28 }}>
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "var(--bone)" : "var(--fg-3)",
                  padding: "8px 0",
                  textDecoration: "none",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: user?.lastSyncAt ? "var(--pulse)" : "var(--fg-4)",
              }}
            />
            {sync}
          </span>
          <SignOutButton />
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: accent,
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 12,
              color: "var(--accent-fg)",
            }}
            aria-label={user?.name ?? "User"}
          >
            {initials}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
