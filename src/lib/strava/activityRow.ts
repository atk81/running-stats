import type { Models } from "node-appwrite";

export interface ActivityRow extends Models.DefaultRow {
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
  bestEfforts?: string | null;
  splitsMetric?: string | null;
  processed: boolean;
}

export interface ActivitiesResponse {
  limit: number;
  nextCursor: string | null;
  activities: ActivityRow[];
}
