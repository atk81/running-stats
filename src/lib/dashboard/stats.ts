import type { ActivityRow } from "@/lib/strava/activityRow";
import type { GoalRow } from "@/lib/goals/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface VolumeProjection {
  targetKm: number;
  currentKm: number;
  percentage: number;
  onPaceDate: Date | null;
  daysEarlyOrLate: number | null;
}

export interface GoalCardView {
  goalKey: string;
  label: string;
  target: string;
  current: string;
  percentage: number;
  done: boolean;
  isVolume: boolean;
}

export interface RecentRunRow {
  id: string;
  title: string;
  date: string;
  distanceKm: number;
  movingTimeFormatted: string;
  paceFormatted: string;
  isPR: boolean;
}

export function ytdKm(activities: ActivityRow[], year: number): number {
  let total = 0;
  for (const a of activities) {
    if (new Date(a.date).getUTCFullYear() === year) {
      total += a.distanceKm;
    }
  }
  return total;
}

export function projectVolume(
  currentKm: number,
  targetKm: number,
  now: Date = new Date(),
): VolumeProjection {
  const year = now.getUTCFullYear();
  const jan1Ms = Date.UTC(year, 0, 1);
  const dec31Ms = Date.UTC(year, 11, 31);
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - jan1Ms) / MS_PER_DAY) + 1);
  const percentage =
    targetKm > 0 ? Math.min(100, Math.round((currentKm / targetKm) * 100)) : 0;

  if (currentKm <= 0 || targetKm <= 0) {
    return { targetKm, currentKm, percentage, onPaceDate: null, daysEarlyOrLate: null };
  }

  const kmPerDay = currentKm / daysElapsed;
  const daysToTarget = Math.ceil(targetKm / kmPerDay);
  const onPaceMs = jan1Ms + (daysToTarget - 1) * MS_PER_DAY;
  const daysEarlyOrLate = Math.round((dec31Ms - onPaceMs) / MS_PER_DAY);

  return {
    targetKm,
    currentKm,
    percentage,
    onPaceDate: new Date(onPaceMs),
    daysEarlyOrLate,
  };
}

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export function formatPaceDate(d: Date): string {
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const TIME_GOAL_LABELS: Record<string, string> = {
  k5: "5K",
  k10: "10K",
  hm: "HALF",
};

export function buildGoalCardViews(
  goals: GoalRow[],
  ytdVolumeKm: number,
): GoalCardView[] {
  const order = ["k5", "k10", "hm", "volume"];
  const byKey = new Map(goals.map((g) => [g.goalKey, g]));

  return order
    .map((key) => byKey.get(key))
    .filter((g): g is GoalRow => Boolean(g))
    .map((g): GoalCardView => {
      if (g.goalKey === "volume") {
        const target = Number(g.targetValue) || 0;
        const pct = target > 0 ? Math.min(100, Math.round((ytdVolumeKm / target) * 100)) : 0;
        return {
          goalKey: g.goalKey,
          label: "VOLUME",
          target: `${target} km`,
          current: `${ytdVolumeKm.toFixed(1)} km`,
          percentage: pct,
          done: pct >= 100,
          isVolume: true,
        };
      }
      return {
        goalKey: g.goalKey,
        label: TIME_GOAL_LABELS[g.goalKey] ?? g.goalKey.toUpperCase(),
        target: g.targetValue,
        current: g.currentValue ?? "—",
        percentage: g.percentage ?? 0,
        done: g.done,
        isVolume: false,
      };
    });
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatMovingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

export function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad2(s)}`;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function buildRecentRunRows(activities: ActivityRow[], limit = 6): RecentRunRow[] {
  return activities.slice(0, limit).map((a) => ({
    id: a.stravaActivityId,
    title: a.title || "Run",
    date: formatActivityDate(a.date),
    distanceKm: a.distanceKm,
    movingTimeFormatted: formatMovingTime(a.movingTimeSec),
    paceFormatted: formatPace(a.avgPaceSecPerKm),
    isPR: (a.prCount ?? 0) > 0,
  }));
}
