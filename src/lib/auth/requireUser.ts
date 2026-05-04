import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSessionClient } from "@/lib/appwrite/server";
import { clearSessionCookie, readSessionSecret } from "@/lib/auth/cookies";

export type AuthResolution =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

async function resolveUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionSecret = readSessionSecret(cookieStore);
  if (!sessionSecret) return null;
  try {
    const { account } = getSessionClient(sessionSecret);
    const me = await account.get();
    return me.$id;
  } catch {
    clearSessionCookie(cookieStore);
    return null;
  }
}

export async function requireUser(): Promise<AuthResolution> {
  const userId = await resolveUserId();
  if (userId) return { ok: true, userId };
  return {
    ok: false,
    response: NextResponse.json(
      { error: "unauthenticated" },
      { status: 401 },
    ),
  };
}

export async function requireUserPage(redirectTo = "/"): Promise<string> {
  const userId = await resolveUserId();
  if (!userId) redirect(redirectTo);
  return userId;
}

export async function getOptionalUserId(): Promise<string | null> {
  return resolveUserId();
}
