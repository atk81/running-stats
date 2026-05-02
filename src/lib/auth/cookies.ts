import "server-only";
import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { getSessionCookieName } from "@/lib/appwrite/server";

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 300;

type CookieStore = Pick<ResponseCookies, "get" | "set" | "delete">;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
} as const;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function readSessionSecret(store: CookieStore): string | undefined {
  return store.get(getSessionCookieName())?.value;
}

export function setSessionCookie(
  store: CookieStore,
  secret: string,
  expireIso: string,
): void {
  const maxAge = Math.max(
    0,
    Math.floor((Date.parse(expireIso) - Date.now()) / 1000),
  );
  store.set(getSessionCookieName(), secret, {
    ...SESSION_COOKIE_OPTIONS,
    secure: isProduction(),
    maxAge,
  });
}

export function clearSessionCookie(store: CookieStore): void {
  store.delete(getSessionCookieName());
}

export function setOAuthStateCookie(store: CookieStore, state: string): void {
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export function readOAuthState(store: CookieStore): string | undefined {
  return store.get(OAUTH_STATE_COOKIE)?.value;
}

export function clearOAuthState(store: CookieStore): void {
  store.delete(OAUTH_STATE_COOKIE);
}
