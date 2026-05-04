import "server-only";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { decrypt, encrypt } from "@/lib/utils/encryption";
import { requireEnv } from "@/lib/utils/env";
import { StravaAuthError, StravaError } from "./types";
import type { StravaRefreshResponse } from "./types";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const REFRESH_SKEW_SEC = 60;
const REFRESH_TIMEOUT_MS = 10_000;

export async function getValidAccessToken(userId: string): Promise<string> {
  const { tablesDB } = getAdminClient();
  const row = await tablesDB.getRow(DATABASE_ID, COLLECTIONS.users, userId);

  const encAccess = row[ATTRS.users.stravaAccessToken];
  const encRefresh = row[ATTRS.users.stravaRefreshToken];
  const expiresAt = row[ATTRS.users.stravaTokenExpiresAt];

  if (typeof encAccess !== "string" || typeof encRefresh !== "string") {
    throw new StravaAuthError("Strava tokens missing on user");
  }
  if (typeof expiresAt !== "number") {
    throw new StravaAuthError("Strava token expiry missing on user");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec + REFRESH_SKEW_SEC < expiresAt) {
    return decrypt(encAccess);
  }

  const refreshToken = await decrypt(encRefresh);
  const refreshed = await refreshAccessToken(refreshToken);

  const [newEncAccess, newEncRefresh] = await Promise.all([
    encrypt(refreshed.access_token),
    encrypt(refreshed.refresh_token),
  ]);

  await tablesDB.updateRow(DATABASE_ID, COLLECTIONS.users, userId, {
    [ATTRS.users.stravaAccessToken]: newEncAccess,
    [ATTRS.users.stravaRefreshToken]: newEncRefresh,
    [ATTRS.users.stravaTokenExpiresAt]: refreshed.expires_at,
  });

  return refreshed.access_token;
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<StravaRefreshResponse> {
  const body = new URLSearchParams({
    client_id: requireEnv("STRAVA_CLIENT_ID"),
    client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  let res: Response;
  try {
    res = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new StravaError(
      "network",
      `Strava token refresh request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (res.status === 400 || res.status === 401) {
    throw new StravaAuthError("Strava refresh token rejected", res.status);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new StravaError(
      "server",
      `Strava token refresh failed (${res.status}): ${detail.slice(0, 200)}`,
      res.status,
    );
  }

  return (await res.json()) as StravaRefreshResponse;
}
