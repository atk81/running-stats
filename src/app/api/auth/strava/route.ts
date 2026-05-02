import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/strava/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "oauth_state";
const STATE_MAX_AGE_SECONDS = 300;

function randomStateHex(byteLength = 32): string {
  const bytes = new Uint8Array(new ArrayBuffer(byteLength));
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export async function GET() {
  const state = randomStateHex();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });
  return NextResponse.redirect(buildAuthorizeUrl({ state }));
}
