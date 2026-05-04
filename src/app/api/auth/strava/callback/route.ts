import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import {
  clearOAuthState,
  readOAuthState,
  setSessionCookie,
} from "@/lib/auth/cookies";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";
import { exchangeCode } from "@/lib/strava/oauth";
import { encrypt } from "@/lib/utils/encryption";

export const runtime = "nodejs";

const APPWRITE_CONFLICT = 409;

function isAppwriteConflict(err: unknown): boolean {
  return err instanceof AppwriteException && err.code === APPWRITE_CONFLICT;
}

function deriveUserId(athleteId: string): string {
  return `s${athleteId}`;
}

function deriveHandle(username: string | null, athleteId: string): string {
  return `@${username ?? `athlete-${athleteId}`}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stravaError = url.searchParams.get("error");

  if (stravaError) {
    return NextResponse.json(
      { error: "strava_authorize_denied", detail: stravaError },
      { status: 400 },
    );
  }
  if (!code || !state) {
    return NextResponse.json({ error: "missing_code_or_state" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const stateCookie = readOAuthState(cookieStore);
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  let token;
  try {
    token = await exchangeCode(code);
  } catch (err) {
    return NextResponse.json(
      { error: "strava_token_exchange_failed", detail: String(err) },
      { status: 502 },
    );
  }

  const athleteId = String(token.athlete.id);
  const userId = deriveUserId(athleteId);
  const email = `strava-${athleteId}@runstats.local`;
  const name = `${token.athlete.firstname} ${token.athlete.lastname}`.trim();
  const handle = deriveHandle(token.athlete.username, athleteId);
  const city = token.athlete.city ?? "";

  const { users, tablesDB } = getAdminClient();

  try {
    await users.create(userId, email, undefined, undefined, name);
  } catch (err) {
    if (!isAppwriteConflict(err)) {
      console.error("callback: users.create failed", err);
      return NextResponse.json({ error: "user_create_failed" }, { status: 500 });
    }
  }

  const [encAccess, encRefresh] = await Promise.all([
    encrypt(token.access_token),
    encrypt(token.refresh_token),
  ]);

  let userRowExists = false;
  try {
    await tablesDB.getRow(DATABASE_ID, COLLECTIONS.users, userId);
    userRowExists = true;
  } catch (err) {
    if (!(err instanceof AppwriteException) || err.code !== 404) {
      console.error("callback: users.getRow probe failed", err);
      return NextResponse.json({ error: "user_doc_probe_failed" }, { status: 500 });
    }
  }

  const tokenFields = {
    [ATTRS.users.stravaAccessToken]: encAccess,
    [ATTRS.users.stravaRefreshToken]: encRefresh,
    [ATTRS.users.stravaTokenExpiresAt]: token.expires_at,
  };

  try {
    if (userRowExists) {
      await tablesDB.updateRow(
        DATABASE_ID,
        COLLECTIONS.users,
        userId,
        tokenFields,
      );
    } else {
      await tablesDB.upsertRow(DATABASE_ID, COLLECTIONS.users, userId, {
        [ATTRS.users.userId]: userId,
        [ATTRS.users.name]: name,
        [ATTRS.users.handle]: handle,
        [ATTRS.users.city]: city,
        [ATTRS.users.stravaAthleteId]: athleteId,
        [ATTRS.users.accentColor]: DEFAULT_ACCENT_COLOR,
        [ATTRS.users.autoSharePR]: true,
        [ATTRS.users.autoShareVolume]: true,
        [ATTRS.users.autoShareWeeklyRecap]: true,
        [ATTRS.users.onboardingComplete]: false,
        ...tokenFields,
      });
    }
  } catch (err) {
    console.error("callback: write users doc failed", err);
    return NextResponse.json({ error: "user_doc_upsert_failed" }, { status: 500 });
  }

  let session;
  try {
    session = await users.createSession(userId);
  } catch (err) {
    console.error("callback: users.createSession failed", err);
    return NextResponse.json({ error: "session_create_failed" }, { status: 500 });
  }

  setSessionCookie(cookieStore, session.secret, session.expire);
  clearOAuthState(cookieStore);

  return NextResponse.redirect(new URL("/", req.url));
}
