import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionClient } from "@/lib/appwrite/server";
import { clearSessionCookie, readSessionSecret } from "@/lib/auth/cookies";

export type AuthResolution =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireUser(): Promise<AuthResolution> {
  const cookieStore = await cookies();
  const sessionSecret = readSessionSecret(cookieStore);
  if (!sessionSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      ),
    };
  }
  try {
    const { account } = getSessionClient(sessionSecret);
    const me = await account.get();
    return { ok: true, userId: me.$id };
  } catch {
    clearSessionCookie(cookieStore);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "session_invalid" },
        { status: 401 },
      ),
    };
  }
}
