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
import { parseTimeToSeconds } from "@/lib/onboarding/timeFormat";

export const runtime = "nodejs";

interface TimeGoalInput {
  targetValue: string;
}
interface VolumeGoalInput {
  targetValue: number | string;
}
interface SaveGoalsRequest {
  k5: TimeGoalInput;
  k10: TimeGoalInput;
  hm: TimeGoalInput;
  volume: VolumeGoalInput;
}

interface FieldError {
  field: GoalKey;
  message: string;
}

function validateBody(
  raw: unknown,
): { ok: true; body: SaveGoalsRequest } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      errors: [{ field: "k5", message: "missing body" }],
    };
  }
  const obj = raw as Record<string, unknown>;
  for (const key of BUILTIN_GOAL_KEYS) {
    const entry = obj[key] as Record<string, unknown> | undefined;
    if (!entry || typeof entry !== "object") {
      errors.push({ field: key, message: "missing" });
      continue;
    }
    const target = entry.targetValue;
    if (key === "volume") {
      const volume = typeof target === "string" ? Number(target) : target;
      if (
        typeof volume !== "number" ||
        !Number.isFinite(volume) ||
        volume <= 0
      ) {
        errors.push({ field: key, message: "must be a positive number (km)" });
      }
    } else {
      if (typeof target !== "string" || parseTimeToSeconds(target) === null) {
        errors.push({ field: key, message: "must be mm:ss or hh:mm:ss" });
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, body: obj as unknown as SaveGoalsRequest };
}

function buildRowPayload(
  userId: string,
  key: GoalKey,
  input: TimeGoalInput | VolumeGoalInput,
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
    const target = (input as VolumeGoalInput).targetValue;
    const km = typeof target === "string" ? Number(target) : target;
    return {
      ...base,
      [ATTRS.goals.targetValue]: String(km),
    };
  }
  const targetStr = (input as TimeGoalInput).targetValue;
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

  const validation = validateBody(raw);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "validation_failed", details: validation.errors },
      { status: 400 },
    );
  }

  const year = new Date().getUTCFullYear();
  const { tablesDB } = getAdminClient();
  const inputs = validation.body;

  try {
    const rows = await Promise.all(
      BUILTIN_GOAL_KEYS.map((key) => {
        const id = buildGoalRowId(auth.userId, key);
        const data = buildRowPayload(auth.userId, key, inputs[key], year);
        return tablesDB.upsertRow(DATABASE_ID, COLLECTIONS.goals, id, data);
      }),
    );
    return NextResponse.json({ goals: rows });
  } catch (err) {
    console.error("goals: upsert failed", err);
    return NextResponse.json({ error: "goals_upsert_failed" }, { status: 500 });
  }
}
