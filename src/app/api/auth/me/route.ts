import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import {
  getAdminClient,
  getSessionClient,
  getSessionCookieName,
} from "@/lib/appwrite/server";

export const runtime = "nodejs";

export interface MeResponse {
  userId: string;
  name: string;
  handle: string;
  city: string;
  avatarFileId: string;
  accentColor: string;
  onboardingComplete: boolean;
  lastSyncAt: string | null;
}

export async function GET() {
  const cookieName = getSessionCookieName();
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(cookieName)?.value;
  if (!sessionSecret) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  let userId: string;
  try {
    const { account } = getSessionClient(sessionSecret);
    const me = await account.get();
    userId = me.$id;
  } catch {
    cookieStore.delete(cookieName);
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
      accentColor: String(doc[ATTRS.users.accentColor] ?? "#FF6800"),
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
