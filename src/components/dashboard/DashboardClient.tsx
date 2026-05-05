"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CountUp,
  Icon,
  Label,
  Pill,
  ProgressBar,
  ProgressRing,
} from "@/components/primitives";
import { useGoals } from "@/lib/hooks/useGoals";
import { useActivities } from "@/lib/hooks/useActivities";
import { useUser } from "@/lib/hooks/useUser";
import {
  SyncMutationError,
  useSyncStrava,
  type SyncStravaResult,
} from "@/lib/hooks/useSyncStrava";
import {
  buildGoalCardViews,
  buildRecentRunRows,
  formatPaceDate,
  projectVolume,
  type GoalCardView,
  type RecentRunRow,
  type VolumeProjection,
} from "@/lib/dashboard/stats";
import type { GoalRow } from "@/lib/goals/types";
import type { ActivityRow } from "@/lib/strava/activityRow";
import { useQueryClient } from "@tanstack/react-query";

const SYNC_ERROR_COPY: Record<string, string> = {
  not_connected: "Reconnect Strava to sync.",
  strava_auth_failed: "Strava session expired — reconnect.",
  strava_rate_limited: "Strava rate-limit hit. Try again shortly.",
  sync_in_progress: "A sync is already running.",
  network: "Network error during sync.",
  sync_failed: "Sync failed. Try again.",
};

export function DashboardClient() {
  const { user } = useUser();
  const accent = user?.accentColor || "var(--ignite)";

  const goalsQuery = useGoals();
  const activitiesQuery = useActivities();
  const queryClient = useQueryClient();
  const syncMutation = useSyncStrava();

  const activities: ActivityRow[] = useMemo(
    () => activitiesQuery.data?.pages.flatMap((p) => p.activities) ?? [],
    [activitiesQuery.data],
  );

  const goalRows: GoalRow[] = goalsQuery.data?.goals ?? [];
  const volumeGoal = goalRows.find((g) => g.goalKey === "volume");
  const volumeTarget = volumeGoal ? Number(volumeGoal.targetValue) || 0 : 0;
  const ytdKmTotal = useMemo(
    () => activities.reduce((sum, a) => sum + a.distanceKm, 0),
    [activities],
  );
  const projection = projectVolume(ytdKmTotal, volumeTarget);
  const goalCards = buildGoalCardViews(goalRows, ytdKmTotal);
  const recentRuns = buildRecentRunRows(activities, 6);

  async function runSync() {
    try {
      const result: SyncStravaResult = await syncMutation.mutateAsync();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
      console.info(`[dashboard] sync ok — ${result.synced} synced, ${result.skipped} skipped`);
    } catch (err) {
      const code = err instanceof SyncMutationError ? err.code : "sync_failed";
      console.error(`[dashboard] sync error: ${code}`);
    }
  }

  if (goalsQuery.isLoading || activitiesQuery.isLoading) {
    return <DashboardLoading />;
  }
  if (goalsQuery.isError || activitiesQuery.isError) {
    return <DashboardError onRetry={() => { goalsQuery.refetch(); activitiesQuery.refetch(); }} />;
  }

  return (
    <div style={{ background: "var(--ink)", color: "var(--bone)", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 20px" }} className="md:px-8">
        <VolumeHero
          accent={accent}
          projection={projection}
          syncing={syncMutation.isPending}
          syncError={syncMutation.error instanceof SyncMutationError ? syncMutation.error : null}
          onSync={runSync}
        />
        <GoalsRow accent={accent} goals={goalCards} />
        <MilestoneFeedEmpty />
        <RecentRunsList runs={recentRuns} accent={accent} />
      </div>
    </div>
  );
}

function VolumeHero({
  accent,
  projection,
  syncing,
  syncError,
  onSync,
}: {
  accent: string;
  projection: VolumeProjection;
  syncing: boolean;
  syncError: SyncMutationError | null;
  onSync: () => void;
}) {
  const onPaceLabel = projection.onPaceDate ? formatPaceDate(projection.onPaceDate) : "—";
  const subtitleSuffix = projection.onPaceDate
    ? ` · on pace for ${onPaceLabel}`
    : projection.targetKm > 0
      ? " · log a run to project pace"
      : "";
  const earlyLabel =
    projection.daysEarlyOrLate === null
      ? ""
      : projection.daysEarlyOrLate >= 0
        ? `${projection.daysEarlyOrLate} days early`
        : `${Math.abs(projection.daysEarlyOrLate)} days late`;

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-[1.25fr_1fr]"
      style={{ gap: 32, marginBottom: 40, alignItems: "end" }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <Label style={{ color: "var(--fg-3)" }}>
            Year · {new Date().getUTCFullYear()}
          </Label>
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

function GoalsRow({ accent, goals }: { accent: string; goals: GoalCardView[] }) {
  const router = useRouter();
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700 }}>
          {new Date().getUTCFullYear()} goals
        </div>
        <Button variant="text" onClick={() => router.push("/goals")}>
          adjust goals <Icon name="chevron" size={14} />
        </Button>
      </div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        style={{ gap: 16, marginBottom: 40 }}
      >
        {goals.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: 20,
              borderRadius: 16,
              border: "1px dashed var(--ink-3)",
              color: "var(--fg-3)",
              fontFamily: "Inter",
              fontSize: 13,
            }}
          >
            No goals yet — onboarding hasn&apos;t finished.
          </div>
        ) : (
          goals.map((g) => (
            <div
              key={g.goalKey}
              style={{
                background: "var(--ink-2)",
                border: "1px solid var(--ink-3)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <Label style={{ color: "var(--fg-3)" }}>
                  {g.label} · {g.target}
                </Label>
                {g.done ? (
                  <Pill tone="pulse">DONE</Pill>
                ) : (
                  <Pill tone="ghost">{g.percentage}%</Pill>
                )}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 54,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  marginTop: 10,
                  color: g.done ? accent : "var(--bone)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {g.current}
              </div>
              <div style={{ marginTop: 14 }}>
                <ProgressBar
                  value={g.percentage}
                  color={g.done ? "var(--pulse)" : accent}
                  bg="var(--ink)"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function MilestoneFeedEmpty() {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700 }}>
          Shareable milestones
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
          coming in phase 4
        </div>
      </div>
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
    </>
  );
}

function RecentRunsList({ runs, accent }: { runs: RecentRunRow[]; accent: string }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700 }}>
          Recent runs
        </div>
      </div>
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
    </>
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
      className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto_auto_100px]"
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
      <div style={{ minWidth: 0 }}>
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

function DashboardLoading() {
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
      Loading dashboard…
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
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
          Dashboard failed to load
        </div>
        <div
          style={{
            fontFamily: "Inter",
            fontSize: 13,
            color: "var(--fg-3)",
            marginBottom: 18,
          }}
        >
          Could not fetch goals or activities.
        </div>
        <Button variant="primary" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Retry
        </Button>
      </div>
    </div>
  );
}
