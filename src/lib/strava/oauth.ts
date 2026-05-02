import "server-only";
import type { StravaScope, StravaTokenResponse } from "./types";

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const DEFAULT_SCOPES: StravaScope[] = ["read", "activity:read_all", "profile:read_all"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is required`);
  return value;
}

export interface BuildAuthorizeUrlInput {
  state: string;
  scope?: StravaScope[];
  approvalPrompt?: "auto" | "force";
}

export function buildAuthorizeUrl(input: BuildAuthorizeUrlInput): string {
  const params = new URLSearchParams({
    client_id: requireEnv("STRAVA_CLIENT_ID"),
    redirect_uri: requireEnv("STRAVA_REDIRECT_URI"),
    response_type: "code",
    scope: (input.scope ?? DEFAULT_SCOPES).join(","),
    state: input.state,
    approval_prompt: input.approvalPrompt ?? "auto",
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const body = new URLSearchParams({
    client_id: requireEnv("STRAVA_CLIENT_ID"),
    client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
  });
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Strava token exchange failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as StravaTokenResponse;
}
