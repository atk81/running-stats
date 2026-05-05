import type { ActivityRow } from "@/lib/strava/activityRow";
import type { GoalRow } from "@/lib/goals/types";
import { BUILTIN_GOAL_KEYS, type GoalKey } from "@/lib/goals/defaults";
import {
  formatActivityDate,
  formatMovingTime,
  formatPace,
} from "@/lib/utils/timeFormat";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PROJECTION_DAYS = 365 * 5;

export interface VolumeProjection {
  targetKm: number;
  currentKm: number;
  percentage: number;
  onPaceDate: Date | null;
  daysEarlyOrLate: number | null;
}

export interface GoalCardView {
  goalKey: GoalKey;
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
  if (daysToTarget > MAX_PROJECTION_DAYS) {
    return { targetKm, currentKm, percentage, onPaceDate: null, daysEarlyOrLate: null };
  }

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

const TIME_GOAL_LABELS: Record<GoalKey, string> = {
  k5: "5K",
  k10: "10K",
  hm: "HALF",
  volume: "VOLUME",
};

export interface DashboardData {
  ytdVolumeKm: number;
  projection: VolumeProjection;
  goalCards: GoalCardView[];
  recentRuns: RecentRunRow[];
}

export function buildDashboardData(
  activities: ActivityRow[],
  goals: GoalRow[],
  now: Date = new Date(),
  recentLimit = 6,
): DashboardData {
  const year = now.getUTCFullYear();
  const ytdVolumeKm = ytdKm(activities, year);
  const byKey = new Map<string, GoalRow>(goals.map((g) => [g.goalKey, g]));
  const volumeGoal = byKey.get("volume");
  const volumeTarget = volumeGoal ? Number(volumeGoal.targetValue) || 0 : 0;
  const projection = projectVolume(ytdVolumeKm, volumeTarget, now);

  const goalCards: GoalCardView[] = [];
  for (const key of BUILTIN_GOAL_KEYS) {
    const g = byKey.get(key);
    if (!g) continue;
    if (key === "volume") {
      goalCards.push({
        goalKey: key,
        label: TIME_GOAL_LABELS[key],
        target: `${volumeTarget} km`,
        current: `${ytdVolumeKm.toFixed(1)} km`,
        percentage: projection.percentage,
        done: projection.percentage >= 100,
        isVolume: true,
      });
      continue;
    }
    goalCards.push({
      goalKey: key,
      label: TIME_GOAL_LABELS[key],
      target: g.targetValue,
      current: g.currentValue ?? "—",
      percentage: g.percentage ?? 0,
      done: g.done,
      isVolume: false,
    });
  }

  const recentRuns = activities.slice(0, recentLimit).map(
    (a): RecentRunRow => ({
      id: a.stravaActivityId,
      title: a.title || "Run",
      date: formatActivityDate(a.date),
      distanceKm: a.distanceKm,
      movingTimeFormatted: formatMovingTime(a.movingTimeSec),
      paceFormatted: formatPace(a.avgPaceSecPerKm),
      isPR: (a.prCount ?? 0) > 0,
    }),
  );

  return { ytdVolumeKm, projection, goalCards, recentRuns };
}
