import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionClient } from "@/lib/appwrite/server";
import { clearSessionCookie, readSessionSecret } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const sessionSecret = readSessionSecret(cookieStore);
  if (sessionSecret) {
    try {
      const { account } = getSessionClient(sessionSecret);
      await account.deleteSession("current");
    } catch (err) {
      console.warn("logout: failed to delete Appwrite session", err);
    }
  }
  clearSessionCookie(cookieStore);
  return new NextResponse(null, { status: 204 });
}
