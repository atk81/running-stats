"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GoalRow, GoalsResponse } from "@/lib/goals/types";
import type { GoalType } from "@/lib/goals/defaults";

interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
}

export class GoalMutationError extends Error {
  readonly code: string;
  readonly details?: Array<{ field: string; message: string }>;
  constructor(code: string, message: string, details?: ApiErrorBody["details"]) {
    super(message);
    this.name = "GoalMutationError";
    this.code = code;
    this.details = details;
  }
}

async function readError(res: Response): Promise<GoalMutationError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return new GoalMutationError(
    body?.error ?? "request_failed",
    body?.message ?? `Request failed (${res.status})`,
    body?.details,
  );
}

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

function findYearForGoal(qc: ReturnType<typeof useQueryClient>, id: string): number | null {
  const queries = qc.getQueriesData<GoalsResponse>({ queryKey: ["goals"] });
  for (const [, data] of queries) {
    if (!data) continue;
    if (data.goals.some((g) => g.$id === id)) return data.year;
  }
  return null;
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation<GoalRow, GoalMutationError, UpdateGoalInput, { previous?: GoalsResponse; year: number | null }>({
    mutationFn: async ({ id, patch }) => {
      const res = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw await readError(res);
      return (await res.json()) as GoalRow;
    },
    onMutate: async ({ id, patch }) => {
      const year = findYearForGoal(qc, id);
      if (year === null) return { year };
      await qc.cancelQueries({ queryKey: ["goals", year] });
      const previous = qc.getQueryData<GoalsResponse>(["goals", year]);
      if (previous) {
        qc.setQueryData<GoalsResponse>(["goals", year], {
          ...previous,
          goals: previous.goals.map((g) => (g.$id === id ? { ...g, ...patch } as GoalRow : g)),
        });
      }
      return { previous, year };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous && ctx.year !== null) {
        qc.setQueryData<GoalsResponse>(["goals", ctx.year], ctx.previous);
      }
    },
    onSettled: (_data, _err, _vars, ctx) => {
      if (ctx?.year !== null && ctx?.year !== undefined) {
        void qc.invalidateQueries({ queryKey: ["goals", ctx.year] });
      }
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation<void, GoalMutationError, string, { previous?: GoalsResponse; year: number | null }>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw await readError(res);
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
    onSettled: (_data, _err, _id, ctx) => {
      if (ctx?.year !== null && ctx?.year !== undefined) {
        void qc.invalidateQueries({ queryKey: ["goals", ctx.year] });
      }
    },
  });
}

export function useCreateCustomGoal() {
  const qc = useQueryClient();
  return useMutation<GoalRow, GoalMutationError, CreateCustomGoalInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ custom: input }),
      });
      if (!res.ok) throw await readError(res);
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
