"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { ActivitiesResponse } from "@/lib/strava/activityRow";

const STALE_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 50;

interface ErrorBody {
  error?: string;
  message?: string;
}

async function fetchActivitiesPage(
  limit: number,
  cursor: string | undefined,
): Promise<ActivitiesResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/activities?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    throw new Error(
      body?.message ?? body?.error ?? "Failed to load activities",
    );
  }
  return (await res.json()) as ActivitiesResponse;
}

export interface UseActivitiesOptions {
  limit?: number;
}

export function useActivities({ limit = DEFAULT_LIMIT }: UseActivitiesOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["activities", limit],
    queryFn: ({ pageParam }) => fetchActivitiesPage(limit, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: STALE_MS,
  });
}
