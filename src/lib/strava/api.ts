import "server-only";
import {
  StravaAuthError,
  StravaError,
  StravaRateLimitError,
  StravaServerError,
  type SummaryActivity,
} from "./types";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_AFTER_SEC = 900;
const MAX_PAGES = 5;

export interface ListAthleteActivitiesInput {
  accessToken: string;
  after: number;
  perPage?: number;
  maxPages?: number;
}

export async function listAthleteActivities(
  input: ListAthleteActivitiesInput,
): Promise<SummaryActivity[]> {
  const perPage = input.perPage ?? 200;
  const maxPages = input.maxPages ?? MAX_PAGES;
  const out: SummaryActivity[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
    url.searchParams.set("after", String(input.after));
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    const batch = await stravaFetch<SummaryActivity[]>(url, input.accessToken);
    out.push(...batch);
    if (batch.length < perPage) break;
  }

  return out;
}

async function stravaFetch<T>(url: URL, accessToken: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new StravaError(
      "network",
      `Strava request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (res.status === 401) {
    throw new StravaAuthError();
  }
  if (res.status === 429) {
    throw new StravaRateLimitError(parseRetryAfter(res));
  }
  if (res.status >= 500) {
    throw new StravaServerError(res.status);
  }
  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new StravaError(
      "server",
      `Strava ${res.status}: ${detail.slice(0, 200)}`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

function parseRetryAfter(res: Response): number {
  const header = res.headers.get("Retry-After");
  if (!header) return DEFAULT_RETRY_AFTER_SEC;
  const asNum = Number(header);
  if (Number.isFinite(asNum) && asNum > 0) return Math.floor(asNum);
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, Math.floor((asDate - Date.now()) / 1000));
  }
  return DEFAULT_RETRY_AFTER_SEC;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
