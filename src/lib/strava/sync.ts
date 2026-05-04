import "server-only";
import { AppwriteException } from "node-appwrite";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { listAthleteActivities } from "./api";
import { getValidAccessToken } from "./tokenRefresh";
import {
  StravaAuthError,
  StravaError,
  StravaRateLimitError,
  type SummaryActivity,
} from "./types";

const POLYLINE_MAX_CHARS = 4096;
const TITLE_MAX_CHARS = 256;
const STALE_LOCK_TTL_MS = 60_000;
const UPSERT_CONCURRENCY = 10;
const SYNCED_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);

export interface SyncResult {
  ok: true;
  synced: number;
  skipped: number;
  lastSyncAt: string;
}

export type SyncErrorCode =
  | "sync_in_progress"
  | "strava_auth_failed"
  | "strava_rate_limited"
  | "sync_failed";

export class SyncError extends Error {
  readonly code: SyncErrorCode;
  readonly status: number;
  readonly retryAfter?: number;
  constructor(code: SyncErrorCode, status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export interface ActivityRowPayload {
  userId: string;
  stravaActivityId: string;
  title: string;
  type: string;
  date: string;
  distanceMeters: number;
  distanceKm: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  avgSpeedMps: number;
  avgPaceSecPerKm: number | null;
  maxSpeedMps: number;
  avgHeartrate: number | null;
  maxHeartrate: number | null;
  elevationGainM: number;
  summaryPolyline: string | null;
  prCount: number;
  achievementCount: number;
  processed: boolean;
}

export function computeYtdAfterTimestamp(now: Date = new Date()): number {
  const jan1 = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0);
  return Math.floor(jan1 / 1000);
}

export function safePace(speedMps: number): number | null {
  if (!Number.isFinite(speedMps) || speedMps <= 0) return null;
  return Math.round(1000 / speedMps);
}

export function clampPolyline(s: string | null | undefined): string | null {
  if (!s) return null;
  if (s.length <= POLYLINE_MAX_CHARS) return s;
  console.warn(
    `[strava-sync] truncating polyline: ${s.length} -> ${POLYLINE_MAX_CHARS}`,
  );
  return s.slice(0, POLYLINE_MAX_CHARS);
}

export function isRunActivity(a: SummaryActivity): boolean {
  return SYNCED_TYPES.has(a.type) || (a.sport_type ? SYNCED_TYPES.has(a.sport_type) : false);
}

export function mapSummaryToRow(
  a: SummaryActivity,
  userId: string,
): ActivityRowPayload {
  const distanceKm = a.distance / 1000;
  return {
    userId,
    stravaActivityId: String(a.id),
    title: (a.name ?? "").slice(0, TITLE_MAX_CHARS),
    type: a.type,
    date: a.start_date,
    distanceMeters: a.distance,
    distanceKm,
    movingTimeSec: a.moving_time,
    elapsedTimeSec: a.elapsed_time,
    avgSpeedMps: a.average_speed,
    avgPaceSecPerKm: safePace(a.average_speed),
    maxSpeedMps: a.max_speed,
    avgHeartrate: a.average_heartrate ?? null,
    maxHeartrate: a.max_heartrate ?? null,
    elevationGainM: a.total_elevation_gain,
    summaryPolyline: clampPolyline(a.map?.summary_polyline ?? null),
    prCount: a.pr_count ?? 0,
    achievementCount: a.achievement_count ?? 0,
    processed: false,
  };
}

function activityRowId(stravaActivityId: string): string {
  return `a${stravaActivityId}`;
}

export async function handleSync(userId: string): Promise<SyncResult> {
  const { tablesDB } = getAdminClient();

  await acquireLock(userId);

  try {
    const accessToken = await getValidAccessToken(userId);
    const after = computeYtdAfterTimestamp();

    let summaries: SummaryActivity[];
    try {
      summaries = await listAthleteActivities({ accessToken, after });
    } catch (err) {
      if (err instanceof StravaAuthError) {
        throw new SyncError("strava_auth_failed", 401, err.message);
      }
      if (err instanceof StravaRateLimitError) {
        throw new SyncError(
          "strava_rate_limited",
          503,
          err.message,
          err.retryAfterSec,
        );
      }
      if (err instanceof StravaError) {
        throw new SyncError("sync_failed", 500, err.message);
      }
      throw err;
    }

    const runs = summaries.filter(isRunActivity);
    const skipped = summaries.length - runs.length;
    const rows = runs.map((a) => mapSummaryToRow(a, userId));

    await upsertActivities(rows);

    const lastSyncAt = new Date().toISOString();
    await tablesDB.updateRow(DATABASE_ID, COLLECTIONS.users, userId, {
      [ATTRS.users.lastSyncAt]: lastSyncAt,
      [ATTRS.users.syncInProgress]: false,
    });

    return { ok: true, synced: rows.length, skipped, lastSyncAt };
  } catch (err) {
    await releaseLockSafely(userId);
    if (err instanceof SyncError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new SyncError("sync_failed", 500, message);
  }
}

async function acquireLock(userId: string): Promise<void> {
  const { tablesDB } = getAdminClient();
  const row = await tablesDB.getRow(DATABASE_ID, COLLECTIONS.users, userId);
  const inProgress = Boolean(row[ATTRS.users.syncInProgress]);
  const lastSyncAt = row[ATTRS.users.lastSyncAt];

  if (inProgress) {
    const lastMs =
      typeof lastSyncAt === "string" ? Date.parse(lastSyncAt) : NaN;
    const isStale =
      !Number.isFinite(lastMs) || Date.now() - lastMs > STALE_LOCK_TTL_MS;
    if (!isStale) {
      throw new SyncError(
        "sync_in_progress",
        409,
        "Sync already running for this user",
      );
    }
  }

  await tablesDB.updateRow(DATABASE_ID, COLLECTIONS.users, userId, {
    [ATTRS.users.syncInProgress]: true,
  });
}

async function releaseLockSafely(userId: string): Promise<void> {
  try {
    const { tablesDB } = getAdminClient();
    await tablesDB.updateRow(DATABASE_ID, COLLECTIONS.users, userId, {
      [ATTRS.users.syncInProgress]: false,
    });
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return;
    console.error("[strava-sync] failed to release lock", err);
  }
}

async function upsertActivities(rows: ActivityRowPayload[]): Promise<void> {
  const { tablesDB } = getAdminClient();
  for (let i = 0; i < rows.length; i += UPSERT_CONCURRENCY) {
    const batch = rows.slice(i, i + UPSERT_CONCURRENCY);
    await Promise.all(
      batch.map((row) =>
        tablesDB.upsertRow(
          DATABASE_ID,
          COLLECTIONS.activities,
          activityRowId(row.stravaActivityId),
          row,
        ),
      ),
    );
  }
}
