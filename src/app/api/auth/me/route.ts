import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient, getSessionClient } from "@/lib/appwrite/server";
import { clearSessionCookie, readSessionSecret } from "@/lib/auth/cookies";
import type { MeResponse } from "@/lib/auth/types";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const sessionSecret = readSessionSecret(cookieStore);
  if (!sessionSecret) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  let userId: string;
  try {
    const { account } = getSessionClient(sessionSecret);
    const me = await account.get();
    userId = me.$id;
  } catch {
    clearSessionCookie(cookieStore);
    return NextResponse.json({ error: "session_invalid" }, { status: 401 });
  }
  try {
    const { databases } = getAdminClient();
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.users, userId);
    const profile: MeResponse = {
      userId,
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
