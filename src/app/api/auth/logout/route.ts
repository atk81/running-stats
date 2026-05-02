import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionClient, getSessionCookieName } from "@/lib/appwrite/server";

export const runtime = "nodejs";

export async function POST() {
  const cookieName = getSessionCookieName();
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(cookieName)?.value;
  if (sessionSecret) {
    try {
      const { account } = getSessionClient(sessionSecret);
      await account.deleteSession("current");
    } catch (err) {
      console.warn("logout: failed to delete Appwrite session", err);
    }
  }
  cookieStore.delete(cookieName);
  return new NextResponse(null, { status: 204 });
}
