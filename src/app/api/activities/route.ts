import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth/requireUser";
import type { ActivityRow } from "@/lib/strava/activityRow";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, n));
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = url.searchParams.get("cursor");

  try {
    const queries = [
      Query.equal(ATTRS.activities.userId, auth.userId),
      Query.orderDesc(ATTRS.activities.date),
      Query.limit(limit),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const { tablesDB } = getAdminClient();
    const result = await tablesDB.listRows(
      DATABASE_ID,
      COLLECTIONS.activities,
      queries,
    );

    const activities = result.rows as unknown as ActivityRow[];
    const nextCursor =
      activities.length === limit ? activities[activities.length - 1].$id : null;

    return NextResponse.json({ limit, nextCursor, activities });
  } catch (err) {
    console.error("activities: list failed", err);
    return NextResponse.json(
      {
        error: "activities_fetch_failed",
        message: "Failed to load activities",
      },
      { status: 500 },
    );
  }
}
