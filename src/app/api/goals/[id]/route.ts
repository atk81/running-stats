import { NextRequest, NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth/requireUser";
import type { GoalRow } from "@/lib/goals/types";
import { isGoalType, type GoalType } from "@/lib/goals/defaults";
import { validatePatchPayload } from "@/lib/goals/validate";
import { parseTimeToSeconds } from "@/lib/utils/timeFormat";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function loadGoalForOwner(
  goalId: string,
  userId: string,
): Promise<{ ok: true; row: GoalRow } | { ok: false; response: NextResponse }> {
  const { tablesDB } = getAdminClient();
  let row: GoalRow;
  try {
    row = await tablesDB.getRow<GoalRow>(DATABASE_ID, COLLECTIONS.goals, goalId);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      return { ok: false, response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
    }
    console.error("goals[id]: load failed", err);
    return {
      ok: false,
      response: NextResponse.json({ error: "goals_fetch_failed" }, { status: 500 }),
    };
  }
  if (row.userId !== userId) {
    return { ok: false, response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }
  return { ok: true, row };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const loaded = await loadGoalForOwner(id, auth.userId);
  if (!loaded.ok) return loaded.response;
  const existing = loaded.row;

  const existingType: GoalType = isGoalType(existing.type) ? existing.type : "time";
  const { errors, payload } = validatePatchPayload(raw, existing.isBuiltin, existingType);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(existing);
  }

  const update: Record<string, unknown> = {};
  if (payload.name !== undefined) update[ATTRS.goals.name] = payload.name;
  if (payload.distanceLabel !== undefined) {
    update[ATTRS.goals.distanceLabel] = payload.distanceLabel;
  }
  if (payload.type !== undefined) update[ATTRS.goals.type] = payload.type;
  if (payload.targetValue !== undefined) {
    update[ATTRS.goals.targetValue] = payload.targetValue;
    const effectiveType = payload.type ?? existingType;
    if (effectiveType === "time") {
      update[ATTRS.goals.targetSeconds] = parseTimeToSeconds(payload.targetValue) ?? 0;
    }
  }

  try {
    const { tablesDB } = getAdminClient();
    const updated = await tablesDB.updateRow<GoalRow>(
      DATABASE_ID,
      COLLECTIONS.goals,
      id,
      update,
    );
    return NextResponse.json(updated);
  } catch (err) {
    console.error("goals[id]: patch failed", err);
    return NextResponse.json({ error: "goals_update_failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const loaded = await loadGoalForOwner(id, auth.userId);
  if (!loaded.ok) return loaded.response;
  if (loaded.row.isBuiltin) {
    return NextResponse.json(
      { error: "cannot_delete_builtin", message: "Built-in goals cannot be deleted." },
      { status: 403 },
    );
  }

  try {
    const { tablesDB } = getAdminClient();
    await tablesDB.deleteRow(DATABASE_ID, COLLECTIONS.goals, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("goals[id]: delete failed", err);
    return NextResponse.json({ error: "goals_delete_failed" }, { status: 500 });
  }
}
