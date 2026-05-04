import { NextRequest, NextResponse } from "next/server";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth/requireUser";
import {
  BUILTIN_GOAL_KEYS,
  BUILTIN_GOAL_META,
  buildGoalRowId,
  type GoalKey,
} from "@/lib/goals/defaults";
import {
  validateGoalInputs,
  type GoalInput,
  type GoalInputMap,
} from "@/lib/goals/validate";
import { parseTimeToSeconds } from "@/lib/utils/timeFormat";

export const runtime = "nodejs";

function buildRowPayload(
  userId: string,
  key: GoalKey,
  input: GoalInput,
  year: number,
): Record<string, unknown> {
  const meta = BUILTIN_GOAL_META[key];
  const base = {
    [ATTRS.goals.userId]: userId,
    [ATTRS.goals.goalKey]: key,
    [ATTRS.goals.name]: meta.name,
    [ATTRS.goals.type]: meta.type,
    [ATTRS.goals.distanceLabel]: meta.distanceLabel,
    [ATTRS.goals.year]: year,
    [ATTRS.goals.isBuiltin]: true,
    [ATTRS.goals.done]: false,
    [ATTRS.goals.percentage]: 0,
  };
  if (key === "volume") {
    const km = Number(input.targetValue);
    return {
      ...base,
      [ATTRS.goals.targetValue]: String(km),
    };
  }
  const targetStr = String(input.targetValue);
  return {
    ...base,
    [ATTRS.goals.targetValue]: targetStr,
    [ATTRS.goals.targetSeconds]: parseTimeToSeconds(targetStr) ?? 0,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const inputs = raw as Partial<GoalInputMap>;
  const errors = validateGoalInputs(inputs);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const year = new Date().getUTCFullYear();
  const { tablesDB } = getAdminClient();

  try {
    const rows = await Promise.all(
      BUILTIN_GOAL_KEYS.map((key) => {
        const id = buildGoalRowId(auth.userId, key);
        const data = buildRowPayload(auth.userId, key, inputs[key]!, year);
        return tablesDB.upsertRow(DATABASE_ID, COLLECTIONS.goals, id, data);
      }),
    );
    return NextResponse.json({ goals: rows });
  } catch (err) {
    console.error("goals: upsert failed", err);
    return NextResponse.json({ error: "goals_upsert_failed" }, { status: 500 });
  }
}
