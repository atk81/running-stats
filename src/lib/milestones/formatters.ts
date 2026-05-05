import { pad2, UPPER_MONTH_ABBRS } from "@/lib/utils/timeFormat";

export type DistanceBucket = "5k" | "10k" | "hm" | "marathon";

export const DISTANCE_BUCKETS: readonly DistanceBucket[] = [
  "5k",
  "10k",
  "hm",
  "marathon",
];

const NORMALIZED_BUCKET_LOOKUP: Record<string, DistanceBucket> = {
  "5k": "5k",
  "10k": "10k",
  halfmarathon: "hm",
  marathon: "marathon",
};

export function bucketFromBestEffortName(name: string): DistanceBucket | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return NORMALIZED_BUCKET_LOOKUP[normalized] ?? null;
}

const BUCKET_LABELS: Record<DistanceBucket, string> = {
  "5k": "5K",
  "10k": "10K",
  hm: "HALF",
  marathon: "MARATHON",
};

export function bucketLabel(bucket: DistanceBucket): string {
  return BUCKET_LABELS[bucket];
}

export function prPillText(bucket: DistanceBucket): string {
  return `NEW ${BUCKET_LABELS[bucket]} PR`;
}

export function formatDeltaSeconds(deltaSec: number): string {
  if (!Number.isFinite(deltaSec) || deltaSec === 0) return "";
  const sign = deltaSec < 0 ? "-" : "+";
  const abs = Math.abs(Math.round(deltaSec));
  if (abs < 60) return `${sign}${abs}s`;
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${pad2(s)}`;
}

const STREAK_THRESHOLDS = [7, 10, 14, 21, 30, 50, 100] as const;
export type StreakThreshold = (typeof STREAK_THRESHOLDS)[number];

export function streakThresholdHit(
  prevDays: number,
  nextDays: number,
): StreakThreshold | null {
  for (let i = STREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = STREAK_THRESHOLDS[i];
    if (prevDays < t && nextDays >= t) return t;
  }
  return null;
}

export function streakPillText(days: number): string {
  return `${days}-RUN STREAK`;
}

const MONTHLY_THRESHOLDS = [50, 100, 150, 200, 250, 300] as const;
export type MonthlyThreshold = (typeof MONTHLY_THRESHOLDS)[number];

export function monthlyThresholdHit(
  prevKm: number,
  nextKm: number,
): MonthlyThreshold | null {
  for (let i = MONTHLY_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = MONTHLY_THRESHOLDS[i];
    if (prevKm < t && nextKm >= t) return t;
  }
  return null;
}

export function monthlyThresholdPillText(
  km: MonthlyThreshold,
  monthIndex: number,
): string {
  return `${km}KM · ${UPPER_MONTH_ABBRS[monthIndex]}`;
}

const VOLUME_STEP_PCT = 5;

export function volumeStepCrossed(prevPct: number, nextPct: number): number | null {
  const prev = Math.max(0, Math.floor(prevPct));
  const next = Math.max(0, Math.floor(nextPct));
  if (next <= prev) return null;
  const prevStep = Math.floor(prev / VOLUME_STEP_PCT);
  const nextStep = Math.floor(next / VOLUME_STEP_PCT);
  if (nextStep > prevStep) return nextStep * VOLUME_STEP_PCT;
  return null;
}

export function volumePillText(pct: number): string {
  return `VOLUME +${Math.round(pct)}%`;
}
