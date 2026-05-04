"use client";

import type { CSSProperties } from "react";
import { Button, Icon } from "@/components/primitives";

export type SyncStatusState = "loading" | "success" | "error";

export interface SyncStatusInlineProps {
  state: SyncStatusState;
  syncedCount?: number;
  elapsedSec?: number;
  errorCode?: string;
  onRetry?: () => void;
  onSkip?: () => void;
  retryPending?: boolean;
}

const ERROR_CAPTIONS: Record<string, string> = {
  strava_auth_failed:
    "Your Strava connection expired. Reconnect on the dashboard.",
  strava_rate_limited:
    "Strava's busy right now. We'll retry from your dashboard in a few minutes.",
  sync_in_progress:
    "Sync is already running. Heading to your dashboard…",
  sync_failed:
    "Something went wrong. Try once more, or skip and pull this in from your dashboard.",
  network:
    "Couldn't reach Strava. Check your connection and try again.",
};

function captionForError(code?: string): string {
  if (!code) return ERROR_CAPTIONS.sync_failed;
  return ERROR_CAPTIONS[code] ?? ERROR_CAPTIONS.sync_failed;
}

const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "20px 22px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  animation: "rs-fade-in 320ms var(--ease-out)",
};

const eyebrowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontFamily: "var(--font-body)",
  fontSize: "var(--fs-micro)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "var(--ls-micro-caps)",
  color: "var(--fg-3)",
  margin: 0,
};

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "var(--fs-h3)",
  lineHeight: "var(--lh-heading)",
  letterSpacing: "var(--ls-heading)",
  color: "var(--ink)",
  margin: 0,
  fontWeight: 600,
};

const captionStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--fs-body-sm)",
  lineHeight: "var(--lh-body)",
  color: "var(--fg-3)",
  maxWidth: 460,
  margin: 0,
};

const monoStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--fg-2)",
  fontVariantNumeric: "tabular-nums",
  letterSpacing: 0,
  margin: 0,
};

const dotStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "var(--ignite)",
  flex: "0 0 auto",
};

const trackStyle: CSSProperties = {
  position: "relative",
  height: 4,
  background: "var(--bone-2)",
  borderRadius: 999,
  overflow: "hidden",
};

const fillStyle: CSSProperties = {
  position: "absolute",
  inset: "0 auto 0 0",
  width: "0%",
  background: "var(--ignite)",
  borderRadius: 999,
  animation: "rs-bar-grow 8s var(--ease-out) forwards",
};

const shimmerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
  animation: "rs-shimmer 1.6s linear infinite",
  mixBlendMode: "overlay",
};

const okBubbleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 999,
  background: "var(--pulse-soft)",
  color: "var(--pulse-deep)",
  animation: "rs-spring 480ms var(--ease-out)",
};

const warnIconStyle: CSSProperties = {
  width: 14,
  height: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--ignite)",
};

// Scoped pulse-dot keyframe override per design.md — globals.css uses
// white-glow rgba intended for dark surfaces; on white card, ignite glow.
const SCOPED_KEYFRAMES = `
  @keyframes rs-pulse-dot-ignite {
    0% { box-shadow: 0 0 0 0 rgba(255, 104, 0, 0.55); }
    70% { box-shadow: 0 0 0 14px rgba(255, 104, 0, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 104, 0, 0); }
  }
  .rs-sync-pulse-dot { animation: rs-pulse-dot-ignite 1.6s var(--ease-out) infinite; }
`;

function pluralizeRuns(n: number): string {
  return n === 1 ? "1 run is ready." : `${n} runs are ready.`;
}

export function SyncStatusInline({
  state,
  syncedCount = 0,
  elapsedSec,
  errorCode,
  onRetry,
  onSkip,
  retryPending,
}: SyncStatusInlineProps) {
  return (
    <section style={cardStyle} role="status" aria-live="polite">
      <style dangerouslySetInnerHTML={{ __html: SCOPED_KEYFRAMES }} />
      {state === "loading" && (
        <>
          <p style={eyebrowStyle}>
            <span className="rs-sync-pulse-dot" style={dotStyle} />
            Strava sync
          </p>
          <h3 style={headingStyle}>Pulling your runs from Strava…</h3>
          <div style={trackStyle} aria-label="Strava sync in progress">
            <div style={fillStyle}>
              <div style={shimmerStyle} />
            </div>
          </div>
          <p style={captionStyle}>
            We&apos;re grabbing your last year of activity. Usually 5-10 seconds.
          </p>
          {typeof elapsedSec === "number" && (
            <p style={monoStyle}>{elapsedSec}s elapsed</p>
          )}
        </>
      )}

      {state === "success" && (
        <>
          <p style={eyebrowStyle}>
            <span style={okBubbleStyle}>
              <Icon name="check" size={16} />
            </span>
            <span style={{ color: "var(--pulse-deep)" }}>Synced</span>
          </p>
          <h3 style={headingStyle}>
            {syncedCount === 0 ? "You're all set." : pluralizeRuns(syncedCount)}
          </h3>
          <p style={captionStyle}>
            {syncedCount === 0
              ? "No runs to import yet — log one on Strava and we'll catch it."
              : "Heading to your dashboard…"}
          </p>
        </>
      )}

      {state === "error" && (
        <>
          <p style={eyebrowStyle}>
            <span style={warnIconStyle}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 9v4M12 17h.01M3.5 19h17a1.5 1.5 0 0 0 1.32-2.21l-8.5-15.5a1.5 1.5 0 0 0-2.64 0l-8.5 15.5A1.5 1.5 0 0 0 3.5 19z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Strava sync
          </p>
          <h3 style={headingStyle}>Sync hit a snag.</h3>
          <p style={{ ...captionStyle, color: "var(--fg-2)" }}>
            {captionForError(errorCode)}
          </p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            {errorCode !== "strava_auth_failed" && onRetry && (
              <Button
                variant="primary"
                onClick={onRetry}
                disabled={retryPending}
              >
                {retryPending ? "Trying…" : "Try again"}
              </Button>
            )}
            {onSkip && (
              <Button variant="ghostLight" onClick={onSkip}>
                {errorCode === "strava_auth_failed"
                  ? "Open dashboard"
                  : "Skip for now"}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
