import "server-only";
import { AppwriteException, type Models, type TablesDB } from "node-appwrite";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { formatMovingTime } from "@/lib/utils/timeFormat";
import type { BestEffort } from "@/lib/strava/types";
import {
  bucketFromBestEffortName,
  type DistanceBucket,
} from "./formatters";

export interface PersonalRecordRow extends Models.DefaultRow {
  userId: string;
  distanceBucket: DistanceBucket;
  bestTimeSec: number;
  bestTimeFormatted: string;
  activityId: string;
  achievedAt: string;
  previousBestSec?: number | null;
}

export interface PrUpsertSummary {
  bucket: DistanceBucket;
  bestTimeSec: number;
  previousBestSec: number | null;
}

export function buildPersonalRecordRowId(userId: string, bucket: DistanceBucket): string {
  return `pr_${userId}_${bucket}`;
}

export function pickPrCandidates(
  bestEfforts: BestEffort[],
): Array<{ bucket: DistanceBucket; effort: BestEffort }> {
  const out: Array<{ bucket: DistanceBucket; effort: BestEffort }> = [];
  for (const effort of bestEfforts) {
    if (effort.pr_rank !== 1) continue;
    if (!Number.isFinite(effort.moving_time) || effort.moving_time <= 0) continue;
    const bucket = bucketFromBestEffortName(effort.name);
    if (!bucket) continue;
    out.push({ bucket, effort });
  }
  return out;
}

export interface UpsertPrParams {
  tablesDB: TablesDB;
  userId: string;
  activityId: string;
  bestEfforts: BestEffort[];
  achievedAt: string;
}

export async function upsertPersonalRecords({
  tablesDB,
  userId,
  activityId,
  bestEfforts,
  achievedAt,
}: UpsertPrParams): Promise<PrUpsertSummary[]> {
  const candidates = pickPrCandidates(bestEfforts);
  if (candidates.length === 0) return [];

  const summaries: PrUpsertSummary[] = [];

  for (const { bucket, effort } of candidates) {
    const rowId = buildPersonalRecordRowId(userId, bucket);
    const newBestSec = Math.round(effort.moving_time);

    const existing = await loadExisting(tablesDB, rowId);
    if (existing && newBestSec >= existing.bestTimeSec) {
      continue;
    }

    const previousBestSec = existing?.bestTimeSec ?? null;
    const payload: Record<string, unknown> = {
      [ATTRS.personalRecords.userId]: userId,
      [ATTRS.personalRecords.distanceBucket]: bucket,
      [ATTRS.personalRecords.bestTimeSec]: newBestSec,
      [ATTRS.personalRecords.bestTimeFormatted]: formatMovingTime(newBestSec),
      [ATTRS.personalRecords.activityId]: activityId,
      [ATTRS.personalRecords.achievedAt]: achievedAt,
      [ATTRS.personalRecords.previousBestSec]: previousBestSec,
    };

    await tablesDB.upsertRow(
      DATABASE_ID,
      COLLECTIONS.personalRecords,
      rowId,
      payload,
    );

    summaries.push({ bucket, bestTimeSec: newBestSec, previousBestSec });
  }

  return summaries;
}

async function loadExisting(
  tablesDB: TablesDB,
  rowId: string,
): Promise<PersonalRecordRow | null> {
  try {
    return await tablesDB.getRow<PersonalRecordRow>(
      DATABASE_ID,
      COLLECTIONS.personalRecords,
      rowId,
    );
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null;
    throw err;
  }
}
