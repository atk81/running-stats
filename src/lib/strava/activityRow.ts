import type { Models } from "node-appwrite";
import type { ActivityRowPayload } from "./sync";

export interface ActivityRow extends ActivityRowPayload, Models.DefaultRow {
  bestEfforts?: string | null;
  splitsMetric?: string | null;
}

export interface ActivitiesResponse {
  limit: number;
  nextCursor: string | null;
  activities: ActivityRow[];
}
