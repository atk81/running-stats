"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AutoShareValues } from "@/components/onboarding/AutoSharePrefs";
import type { GoalFormState } from "@/components/onboarding/GoalSetting";
import {
  GoalsValidationError,
  type GoalFieldError,
} from "@/lib/goals/validate";

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

interface GoalsSaveErrorBody {
  error: string;
  details?: GoalFieldError[];
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
    const err = (await res.json().catch(() => null)) as GoalsSaveErrorBody | null;
    if (err?.details && err.details.length > 0) {
      throw new GoalsValidationError(err.details);
    }
    throw new Error(err?.error ?? "save_failed");
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
  return useMutation({
    mutationFn: saveGoalsRequest,
  });
}

interface FinalizeResponse {
  onboardingComplete: boolean;
}

interface FinalizeErrorBody {
  error: string;
}

async function finalizeOnboardingRequest(
  values: AutoShareValues,
): Promise<FinalizeResponse> {
  const res = await fetch("/api/users/onboarding", {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as FinalizeErrorBody | null;
    throw new Error(err?.error ?? "finalize_failed");
  }
  return (await res.json()) as FinalizeResponse;
}

export function useFinalizeOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: finalizeOnboardingRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
