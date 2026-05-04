"use client";

import { useMutation } from "@tanstack/react-query";
import type { SyncErrorCode } from "@/lib/strava/errorCodes";

export interface SyncStravaResult {
  ok: true;
  synced: number;
  skipped: number;
  lastSyncAt: string;
}

interface SyncErrorBody {
  error?: SyncErrorCode;
  message?: string;
  retryAfter?: number;
}

export class SyncMutationError extends Error {
  readonly code: SyncErrorCode;
  readonly retryAfter?: number;
  constructor(code: SyncErrorCode, message: string, retryAfter?: number) {
    super(message);
    this.name = "SyncMutationError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function syncStravaRequest(): Promise<SyncStravaResult> {
  let res: Response;
  try {
    res = await fetch("/api/strava/sync", {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    throw new SyncMutationError(
      "network",
      err instanceof Error ? err.message : "Network error",
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as SyncErrorBody | null;
    throw new SyncMutationError(
      (body?.error ?? "sync_failed") as SyncErrorCode,
      body?.message ?? "Sync failed",
      body?.retryAfter,
    );
  }
  return (await res.json()) as SyncStravaResult;
}

export function useSyncStrava() {
  return useMutation({
    mutationFn: syncStravaRequest,
  });
}
