import { NextRequest, NextResponse } from "next/server";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth/requireUser";

export const runtime = "nodejs";

interface FinalizeBody {
  autoSharePR?: boolean;
  autoShareVolume?: boolean;
  autoShareWeeklyRecap?: boolean;
}

export async function PATCH(req: NextRequest) {
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

  const body = raw as FinalizeBody;
  const data: Record<string, unknown> = {
    [ATTRS.users.onboardingComplete]: true,
  };
  if (typeof body.autoSharePR === "boolean") {
    data[ATTRS.users.autoSharePR] = body.autoSharePR;
  }
  if (typeof body.autoShareVolume === "boolean") {
    data[ATTRS.users.autoShareVolume] = body.autoShareVolume;
  }
  if (typeof body.autoShareWeeklyRecap === "boolean") {
    data[ATTRS.users.autoShareWeeklyRecap] = body.autoShareWeeklyRecap;
  }

  try {
    const { tablesDB } = getAdminClient();
    const updated = await tablesDB.updateRow(
      DATABASE_ID,
      COLLECTIONS.users,
      auth.userId,
      data,
    );
    return NextResponse.json({
      onboardingComplete: Boolean(updated[ATTRS.users.onboardingComplete]),
    });
  } catch (err) {
    console.error("onboarding: user doc update failed", err);
    return NextResponse.json(
      { error: "user_doc_update_failed" },
      { status: 500 },
    );
  }
}
