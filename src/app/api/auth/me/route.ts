import { NextResponse } from "next/server";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth/requireUser";
import type { MeResponse } from "@/lib/auth/types";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { tablesDB } = getAdminClient();
    const doc = await tablesDB.getRow(
      DATABASE_ID,
      COLLECTIONS.users,
      auth.userId,
    );
    const profile: MeResponse = {
      userId: auth.userId,
      name: String(doc[ATTRS.users.name] ?? ""),
      handle: String(doc[ATTRS.users.handle] ?? ""),
      city: String(doc[ATTRS.users.city] ?? ""),
      avatarFileId: String(doc[ATTRS.users.avatarFileId] ?? ""),
      accentColor: String(doc[ATTRS.users.accentColor] ?? DEFAULT_ACCENT_COLOR),
      onboardingComplete: Boolean(doc[ATTRS.users.onboardingComplete]),
      lastSyncAt: doc[ATTRS.users.lastSyncAt]
        ? String(doc[ATTRS.users.lastSyncAt])
        : null,
    };
    return NextResponse.json(profile);
  } catch (err) {
    console.error("me: users doc fetch failed", err);
    return NextResponse.json({ error: "user_doc_missing" }, { status: 500 });
  }
}
