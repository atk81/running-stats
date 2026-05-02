"use client";

import { createContext, useMemo, type ReactNode } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { MeResponse } from "@/app/api/auth/me/route";

type MeQuery = UseQueryResult<MeResponse | null, Error>;

export interface UserContextValue {
  user: MeResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export const UserContext = createContext<UserContextValue | null>(null);

async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/api/auth/me failed: ${res.status}`);
  return (await res.json()) as MeResponse;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const query: MeQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  const value = useMemo<UserContextValue>(
    () => ({
      user: query.data ?? null,
      loading: query.isLoading,
      error: query.error,
      refetch: query.refetch,
    }),
    [query.data, query.isLoading, query.error, query.refetch],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
