import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setOAuthStateCookie } from "@/lib/auth/cookies";
import { buildAuthorizeUrl } from "@/lib/strava/oauth";

export const runtime = "nodejs";

const STATE_BYTE_LENGTH = 32;

function randomStateHex(): string {
  const bytes = new Uint8Array(new ArrayBuffer(STATE_BYTE_LENGTH));
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("hex");
}

export async function GET() {
  const state = randomStateHex();
  const cookieStore = await cookies();
  setOAuthStateCookie(cookieStore, state);
  return NextResponse.redirect(buildAuthorizeUrl({ state }));
}
