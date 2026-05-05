"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  CountUp,
  Icon,
  Label,
  Pill,
  ProgressBar,
  ProgressRing,
} from "@/components/primitives";
import { PageError, PageLoading } from "@/components/chrome/PageStatus";
import { useGoals } from "@/lib/hooks/useGoals";
import { useActivities } from "@/lib/hooks/useActivities";
import { useUser } from "@/lib/hooks/useUser";
import {
  SyncMutationError,
  useSyncStrava,
} from "@/lib/hooks/useSyncStrava";
import {
  buildDashboardData,
  type GoalCardView,
  type RecentRunRow,
  type VolumeProjection,
} from "@/lib/dashboard/stats";
import { formatPaceDate } from "@/lib/utils/timeFormat";
import type { SyncErrorCode } from "@/lib/strava/errorCodes";

const SYNC_ERROR_COPY: Record<SyncErrorCode, string> = {
  strava_auth_failed: "Strava session expired — reconnect.",
  strava_rate_limited: "Strava rate-limit hit. Try again shortly.",
  sync_in_progress: "A sync is already running.",
  sync_failed: "Sync failed. Try again.",
  network: "Network error during sync.",
};

export function DashboardClient() {
  const { user } = useUser();
  const accent = user?.accentColor || "var(--ignite)";
  const year = new Date().getUTCFullYear();

  const goalsQuery = useGoals();
  const activitiesQuery = useActivities();
  const queryClient = useQueryClient();
  const syncMutation = useSyncStrava();

  const activities = useMemo(
    () => activitiesQuery.data?.pages.flatMap((p) => p.activities) ?? [],
    [activitiesQuery.data],
  );

  const { projection, goalCards, recentRuns } = useMemo(
    () => buildDashboardData(activities, goalsQuery.data?.goals ?? []),
    [activities, goalsQuery.data],
  );

  async function runSync() {
    if (syncMutation.isPending) return;
    try {
      await syncMutation.mutateAsync();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
    } catch {
      /* error surfaced via syncMutation.error */
    }
  }

  if (goalsQuery.isLoading || activitiesQuery.isLoading) {
    return <PageLoading label="Loading dashboard…" />;
  }
  if (goalsQuery.isError || activitiesQuery.isError) {
    return (
      <PageError
        title="Dashboard failed to load"
        description="Could not fetch goals or activities."
        onRetry={() => {
          void Promise.all([goalsQuery.refetch(), activitiesQuery.refetch()]);
        }}
      />
    );
  }

  return (
    <div style={{ background: "var(--ink)", color: "var(--bone)", minHeight: "calc(100vh - 56px)" }}>
      <div
        className="md:px-8"
        style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 20px" }}
      >
        <VolumeHero
          accent={accent}
          year={year}
          projection={projection}
          syncing={syncMutation.isPending}
          syncError={syncMutation.error instanceof SyncMutationError ? syncMutation.error : null}
          onSync={runSync}
        />
        <SectionHeader
          title={`${year} goals`}
          slot={
            <RouterButton href="/goals">
              adjust goals <Icon name="chevron" size={14} />
            </RouterButton>
          }
        />
        <GoalsGrid goals={goalCards} accent={accent} />
        <SectionHeader
          title="Shareable milestones"
          slot={
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
              coming in phase 4
            </span>
          }
        />
        <MilestoneFeedEmpty />
        <SectionHeader title="Recent runs" />
        <RecentRunsList runs={recentRuns} accent={accent} />
      </div>
    </div>
  );
}

function VolumeHero({
  accent,
  year,
  projection,
  syncing,
  syncError,
  onSync,
}: {
  accent: string;
  year: number;
  projection: VolumeProjection;
  syncing: boolean;
  syncError: SyncMutationError | null;
  onSync: () => void;
}) {
  const onPaceLabel = projection.onPaceDate ? formatPaceDate(projection.onPaceDate) : "—";
  const subtitleSuffix = paceSubtitleSuffix(projection);
  const earlyLabel = earlyLateLabel(projection.daysEarlyOrLate);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr]"
      style={{ gap: 32, marginBottom: 40, alignItems: "end" }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <Label style={{ color: "var(--fg-3)" }}>Year · {year}</Label>
          <Pill tone="ghost">mid-season</Pill>
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(96px, 14vw, 168px)",
            lineHeight: 0.88,
            letterSpacing: "-0.02em",
          }}
        >
          <CountUp
            to={projection.currentKm}
            duration={1400}
            trigger={projection.currentKm}
            format={(v) => v.toFixed(1)}
          />
          <span style={{ fontSize: "0.34em", color: "var(--fg-3)" }}> km</span>
        </div>
        <div
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: "var(--fg-3)",
            marginTop: 8,
            marginBottom: 14,
          }}
        >
          of {projection.targetKm} km · {projection.percentage}%{subtitleSuffix}
        </div>
        <ProgressBar value={projection.percentage} color={accent} height={8} bg="var(--ink-2)" />
        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button variant="primary" onClick={onSync} disabled={syncing}>
            <Icon name="zap" size={16} /> {syncing ? "Syncing…" : "Log today's run"}
          </Button>
          <Button variant="ghost" onClick={onSync} disabled={syncing}>
            <Icon name="refresh" size={16} /> Re-sync Strava
          </Button>
        </div>
        {syncError && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--amber-deep, var(--amber))",
            }}
          >
            {SYNC_ERROR_COPY[syncError.code] ?? syncError.message}
          </div>
        )}
      </div>
      <div
        className="hidden md:flex"
        style={{ gap: 24, alignItems: "center", justifyContent: "flex-end" }}
      >
        <div style={{ textAlign: "right" }}>
          <Label style={{ color: "var(--fg-3)" }}>On pace for</Label>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 64,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {onPaceLabel}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              marginTop: 6,
            }}
          >
            {earlyLabel}
          </div>
        </div>
        <ProgressRing
          value={projection.percentage}
          size={148}
          color={accent}
          trackColor="var(--ink-2)"
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 48,
                lineHeight: 1,
                color: "var(--bone)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {projection.percentage}
            </div>
            <div
              style={{
                fontFamily: "Inter",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--fg-3)",
              }}
            >
              PERCENT
            </div>
          </div>
        </ProgressRing>
      </div>
    </div>
  );
}

function paceSubtitleSuffix(projection: VolumeProjection): string {
  if (projection.onPaceDate) return ` · on pace for ${formatPaceDate(projection.onPaceDate)}`;
  if (projection.targetKm > 0) return " · log a run to project pace";
  return "";
}

function earlyLateLabel(days: number | null): string {
  if (days === null) return "";
  if (days >= 0) return `${days} days early`;
  return `${Math.abs(days)} days late`;
}

function GoalsGrid({ goals, accent }: { goals: GoalCardView[]; accent: string }) {
  if (goals.length === 0) {
    return (
      <div
        style={{
          padding: 20,
          marginBottom: 40,
          borderRadius: 16,
          border: "1px dashed var(--ink-3)",
          color: "var(--fg-3)",
          fontFamily: "Inter",
          fontSize: 13,
        }}
      >
        No goals yet — onboarding hasn&apos;t finished.
      </div>
    );
  }
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      style={{ gap: 16, marginBottom: 40 }}
    >
      {goals.map((g) => (
        <GoalCard key={g.goalKey} goal={g} accent={accent} />
      ))}
    </div>
  );
}

function GoalCard({ goal, accent }: { goal: GoalCardView; accent: string }) {
  return (
    <div
      style={{
        background: "var(--ink-2)",
        border: "1px solid var(--ink-3)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label style={{ color: "var(--fg-3)" }}>
          {goal.label} · {goal.target}
        </Label>
        {goal.done ? <Pill tone="pulse">DONE</Pill> : <Pill tone="ghost">{goal.percentage}%</Pill>}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 54,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          marginTop: 10,
          color: goal.done ? accent : "var(--bone)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {goal.current}
      </div>
      <div style={{ marginTop: 14 }}>
        <ProgressBar
          value={goal.percentage}
          color={goal.done ? "var(--pulse)" : accent}
          bg="var(--ink)"
        />
      </div>
    </div>
  );
}

function MilestoneFeedEmpty() {
  return (
    <div
      style={{
        background: "var(--ink-2)",
        border: "1px dashed var(--ink-3)",
        borderRadius: 16,
        padding: "32px 24px",
        marginBottom: 40,
        textAlign: "center",
        color: "var(--fg-3)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--bone)",
          marginBottom: 8,
        }}
      >
        No milestones yet
      </div>
      <div style={{ fontFamily: "Inter", fontSize: 13, lineHeight: 1.5 }}>
        PR detection, volume progress, and streak milestones unlock once milestone
        detection ships in phase 4.
      </div>
    </div>
  );
}

function RecentRunsList({ runs, accent }: { runs: RecentRunRow[]; accent: string }) {
  return (
    <div
      style={{
        background: "var(--ink-2)",
        border: "1px solid var(--ink-3)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {runs.length === 0 ? (
        <div
          style={{
            padding: "20px 18px",
            fontFamily: "Inter",
            fontSize: 13,
            color: "var(--fg-3)",
            textAlign: "center",
          }}
        >
          No runs synced yet — hit re-sync above.
        </div>
      ) : (
        runs.map((r, i) => (
          <RecentRunRowItem
            key={r.id}
            run={r}
            accent={accent}
            isLast={i === runs.length - 1}
          />
        ))
      )}
    </div>
  );
}

function RecentRunRowItem({
  run,
  accent,
  isLast,
}: {
  run: RecentRunRow;
  accent: string;
  isLast: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_auto_auto_100px]"
      style={{
        gap: 16,
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--ink-3)",
        background: run.isPR ? "rgba(255,104,0,0.06)" : "transparent",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 8,
          background: run.isPR ? "rgba(255,104,0,0.16)" : "var(--ink-3)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-display)",
          fontSize: 20,
          color: run.isPR ? accent : "var(--bone)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(Math.floor(run.distanceKm)).padStart(2, "0")}
      </div>
      <div>
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {run.title}
          {run.isPR && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: accent,
                animation: "rs-blink 1.4s infinite",
                flexShrink: 0,
              }}
            />
          )}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            marginTop: 2,
          }}
        >
          {run.date} · {run.movingTimeFormatted}
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
        {run.distanceKm.toFixed(2)} km
      </div>
      <div
        className="hidden md:block"
        style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-2)" }}
      >
        {run.paceFormatted}/km
      </div>
      <div className="hidden md:block" style={{ textAlign: "right" }}>
        {run.isPR && <Pill tone="igniteSolid">PR</Pill>}
      </div>
    </div>
  );
}

function SectionHeader({ title, slot }: { title: string; slot?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 14,
      }}
    >
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700 }}>
        {title}
      </div>
      {slot}
    </div>
  );
}

function RouterButton({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <Button variant="text" onClick={() => router.push(href)}>
      {children}
    </Button>
  );
}

