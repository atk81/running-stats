"use client";

import { useQuery } from "@tanstack/react-query";
import type { GoalsResponse } from "@/lib/goals/types";

const STALE_MS = 5 * 60 * 1000;

interface ErrorBody {
  error?: string;
  message?: string;
}

async function fetchGoals(year: number): Promise<GoalsResponse> {
  const res = await fetch(`/api/goals?year=${year}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    throw new Error(body?.message ?? body?.error ?? "Failed to load goals");
  }
  return (await res.json()) as GoalsResponse;
}

export function useGoals(year?: number) {
  const targetYear = year ?? new Date().getUTCFullYear();
  return useQuery({
    queryKey: ["goals", targetYear],
    queryFn: () => fetchGoals(targetYear),
    staleTime: STALE_MS,
  });
}
