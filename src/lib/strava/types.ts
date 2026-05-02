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
