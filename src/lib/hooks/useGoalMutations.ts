"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { GoalRow, GoalsResponse } from "@/lib/goals/types";
import type { GoalType } from "@/lib/goals/defaults";
import { ApiMutationError, parseApiError } from "@/lib/api/errors";

export { ApiMutationError as GoalMutationError };

export interface UpdateGoalInput {
  id: string;
  patch: {
    targetValue?: string;
    name?: string;
    distanceLabel?: string;
    type?: GoalType;
  };
}

export interface CreateCustomGoalInput {
  name: string;
  distanceLabel?: string;
  type: GoalType;
  targetValue: string;
}

function findYearForGoal(qc: QueryClient, id: string): number | null {
  const queries = qc.getQueriesData<GoalsResponse>({ queryKey: ["goals"] });
  for (const [, data] of queries) {
    if (data?.goals.some((g) => g.$id === id)) return data.year;
  }
  return null;
}

function patchCacheRow(
  qc: QueryClient,
  year: number,
  id: string,
  apply: (row: GoalRow) => GoalRow,
): GoalsResponse | undefined {
  const previous = qc.getQueryData<GoalsResponse>(["goals", year]);
  if (!previous) return undefined;
  qc.setQueryData<GoalsResponse>(["goals", year], {
    ...previous,
    goals: previous.goals.map((g) => (g.$id === id ? apply(g) : g)),
  });
  return previous;
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation<
    GoalRow,
    ApiMutationError,
    UpdateGoalInput,
    { previous?: GoalsResponse; year: number | null }
  >({
    mutationFn: async ({ id, patch }) => {
      const res = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw await parseApiError(res);
      return (await res.json()) as GoalRow;
    },
    onMutate: async ({ id, patch }) => {
      const year = findYearForGoal(qc, id);
      if (year === null) return { year };
      await qc.cancelQueries({ queryKey: ["goals", year] });
      const previous = patchCacheRow(qc, year, id, (g) => ({ ...g, ...patch }));
      return { previous, year };
    },
    onSuccess: (serverRow, _vars, ctx) => {
      if (ctx?.year !== null && ctx?.year !== undefined) {
        patchCacheRow(qc, ctx.year, serverRow.$id, () => serverRow);
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous && ctx.year !== null) {
        qc.setQueryData<GoalsResponse>(["goals", ctx.year], ctx.previous);
      }
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation<
    void,
    ApiMutationError,
    string,
    { previous?: GoalsResponse; year: number | null }
  >({
    mutationFn: async (id) => {
      const res = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw await parseApiError(res);
    },
    onMutate: async (id) => {
      const year = findYearForGoal(qc, id);
      if (year === null) return { year };
      await qc.cancelQueries({ queryKey: ["goals", year] });
      const previous = qc.getQueryData<GoalsResponse>(["goals", year]);
      if (previous) {
        qc.setQueryData<GoalsResponse>(["goals", year], {
          ...previous,
          goals: previous.goals.filter((g) => g.$id !== id),
        });
      }
      return { previous, year };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous && ctx.year !== null) {
        qc.setQueryData<GoalsResponse>(["goals", ctx.year], ctx.previous);
      }
    },
  });
}

export function useCreateCustomGoal() {
  const qc = useQueryClient();
  return useMutation<GoalRow, ApiMutationError, CreateCustomGoalInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ custom: input }),
      });
      if (!res.ok) throw await parseApiError(res);
      return (await res.json()) as GoalRow;
    },
    onSuccess: (row) => {
      const year = row.year;
      const previous = qc.getQueryData<GoalsResponse>(["goals", year]);
      if (previous) {
        qc.setQueryData<GoalsResponse>(["goals", year], {
          ...previous,
          goals: [...previous.goals, row],
        });
      } else {
        void qc.invalidateQueries({ queryKey: ["goals", year] });
      }
    },
  });
}
