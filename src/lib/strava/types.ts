export interface SummaryAthlete {
  id: number;
  username: string | null;
  firstname: string;
  lastname: string;
  city: string | null;
  state: string | null;
  country: string | null;
  sex: string | null;
  profile: string;
  profile_medium: string;
}

export interface StravaTokenResponse {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  scope?: string;
  athlete: SummaryAthlete;
}

export interface StravaRefreshResponse {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

export type StravaScope =
  | "read"
  | "read_all"
  | "profile:read_all"
  | "profile:write"
  | "activity:read"
  | "activity:read_all"
  | "activity:write";

export interface SummaryActivityMap {
  id: number;
  summary_polyline: string | null;
}

export interface SummaryActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  start_date_local?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain: number;
  pr_count?: number;
  achievement_count?: number;
  map?: SummaryActivityMap;
}

export type StravaErrorCode = "auth" | "rate_limit" | "server" | "network";

export class StravaError extends Error {
  readonly code: StravaErrorCode;
  readonly status?: number;
  constructor(code: StravaErrorCode, message: string, status?: number) {
    super(message);
    this.name = "StravaError";
    this.code = code;
    this.status = status;
  }
}

export class StravaAuthError extends StravaError {
  constructor(message = "Strava token rejected", status = 401) {
    super("auth", message, status);
    this.name = "StravaAuthError";
  }
}

export class StravaRateLimitError extends StravaError {
  readonly retryAfterSec: number;
  constructor(retryAfterSec: number, message = "Strava rate limit exceeded") {
    super("rate_limit", message, 429);
    this.name = "StravaRateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

export class StravaServerError extends StravaError {
  constructor(status: number, message = "Strava server error") {
    super("server", message, status);
    this.name = "StravaServerError";
  }
}
