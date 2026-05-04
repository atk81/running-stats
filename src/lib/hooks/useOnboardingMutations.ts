"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GoalFormState } from "@/components/onboarding/GoalSetting";

interface AvatarUploadResponse {
  avatarFileId: string;
}

interface AvatarErrorResponse {
  error: string;
  detail?: string;
}

interface GoalsSaveResponse {
  goals: unknown[];
}

interface GoalsSaveError {
  error: string;
  details?: { field: string; message: string }[];
}

async function uploadAvatarRequest(file: File): Promise<AvatarUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/users/avatar", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | AvatarErrorResponse
      | null;
    const detail = body?.detail ? ` (${body.detail})` : "";
    throw new Error(`${body?.error ?? "upload_failed"}${detail}`);
  }
  return (await res.json()) as AvatarUploadResponse;
}

async function saveGoalsRequest(
  values: GoalFormState,
): Promise<GoalsSaveResponse> {
  const body = {
    k5: { targetValue: values.k5 },
    k10: { targetValue: values.k10 },
    hm: { targetValue: values.hm },
    volume: { targetValue: Number(values.volume) },
  };
  const res = await fetch("/api/goals", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as GoalsSaveError | null;
    const error = new Error(err?.error ?? "save_failed");
    if (err?.details) {
      (error as Error & { fieldErrors?: GoalsSaveError["details"] }).fieldErrors =
        err.details;
    }
    throw error;
  }
  return (await res.json()) as GoalsSaveResponse;
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadAvatarRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useSaveGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveGoalsRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
