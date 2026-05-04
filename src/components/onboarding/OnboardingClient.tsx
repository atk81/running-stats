"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button, FieldError, Icon } from "@/components/primitives";
import { Wordmark } from "@/components/chrome/Wordmark";
import {
  AutoSharePrefs,
  type AutoShareKey,
  type AutoShareValues,
} from "./AutoSharePrefs";
import { DuotonePreview } from "./DuotonePreview";
import { GoalFormState, GoalSetting } from "./GoalSetting";
import { OnboardingStep } from "./OnboardingStep";
import { PhotoUpload } from "./PhotoUpload";
import { StepProgress } from "./StepProgress";
import { SyncStatusInline, type SyncStatusState } from "./SyncStatusInline";
import {
  BUILTIN_GOAL_META,
  type GoalKey,
} from "@/lib/goals/defaults";
import {
  GoalsValidationError,
  validateGoalInputs,
} from "@/lib/goals/validate";
import {
  useFinalizeOnboarding,
  useSaveGoals,
  useUploadAvatar,
} from "@/lib/hooks/useOnboardingMutations";
import { SyncMutationError, useSyncStrava } from "@/lib/hooks/useSyncStrava";

export interface OnboardingInitialGoal {
  goalKey: GoalKey;
  targetValue: string;
}

export interface OnboardingClientProps {
  accentColor: string;
  initialAvatarFileId: string;
  initialGoals: OnboardingInitialGoal[];
  initialAutoShare: AutoShareValues;
}

const TOTAL_STEPS = 3;

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bone)",
  color: "var(--ink)",
  width: "100%",
};

function buildInitialGoalForm(rows: OnboardingInitialGoal[]): GoalFormState {
  const seeded: GoalFormState = {
    k5: BUILTIN_GOAL_META.k5.defaultTarget,
    k10: BUILTIN_GOAL_META.k10.defaultTarget,
    hm: BUILTIN_GOAL_META.hm.defaultTarget,
    volume: BUILTIN_GOAL_META.volume.defaultTarget,
  };
  for (const row of rows) {
    if (row.goalKey in seeded) seeded[row.goalKey] = row.targetValue;
  }
  return seeded;
}

function fieldErrorsToMap(
  errors: { field: GoalKey; message: string }[],
): Partial<Record<GoalKey, string>> {
  const map: Partial<Record<GoalKey, string>> = {};
  for (const e of errors) map[e.field] = e.message;
  return map;
}

const FINALIZE_ERROR_COPY: Record<string, string> = {
  user_doc_update_failed: "Couldn't save your preferences. Try again.",
  invalid_body: "Something looks off with the form. Try again.",
  invalid_json: "Something looks off with the form. Try again.",
};

function humanizeFinalizeError(message: string): string {
  return FINALIZE_ERROR_COPY[message] ?? "Couldn't finish onboarding. Try again.";
}

export function OnboardingClient({
  accentColor: accent,
  initialAvatarFileId,
  initialGoals,
  initialAutoShare,
}: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [avatarFileId, setAvatarFileId] = useState(initialAvatarFileId);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [goalValues, setGoalValues] = useState<GoalFormState>(() =>
    buildInitialGoalForm(initialGoals),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<GoalKey, string>>
  >({});
  const [autoShare, setAutoShare] = useState<AutoShareValues>(initialAutoShare);

  const uploadAvatar = useUploadAvatar();
  const saveGoals = useSaveGoals();
  const finalize = useFinalizeOnboarding();
  const syncStrava = useSyncStrava();

  const [syncState, setSyncState] = useState<SyncStatusState | null>(null);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncErrorCode, setSyncErrorCode] = useState<string | undefined>();
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  useEffect(() => {
    if (syncState !== "loading") {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      return;
    }
    const startedAt = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [syncState]);

  const onSelectFile = async (file: File) => {
    setPhotoError(null);
    setPhotoPreview(URL.createObjectURL(file));
    try {
      const result = await uploadAvatar.mutateAsync(file);
      setAvatarFileId(result.avatarFileId);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "Avatar upload failed.",
      );
    }
  };

  const onContinueGoals = async () => {
    const localErrors = validateGoalInputs({
      k5: { targetValue: goalValues.k5 },
      k10: { targetValue: goalValues.k10 },
      hm: { targetValue: goalValues.hm },
      volume: { targetValue: Number(goalValues.volume) },
    });
    if (localErrors.length > 0) {
      setFieldErrors(fieldErrorsToMap(localErrors));
      return;
    }
    setFieldErrors({});
    try {
      await saveGoals.mutateAsync(goalValues);
      setStep(2);
    } catch (err) {
      if (err instanceof GoalsValidationError) {
        setFieldErrors(fieldErrorsToMap(err.fieldErrors));
      }
    }
  };

  const goalSaveError =
    saveGoals.error && !(saveGoals.error instanceof GoalsValidationError)
      ? saveGoals.error.message
      : null;

  const hasPhoto = Boolean(avatarFileId || photoPreview);

  const onAutoShareChange = (key: AutoShareKey, next: boolean) => {
    setAutoShare((prev) => ({ ...prev, [key]: next }));
  };

  const goToDashboard = () => router.push("/dashboard");

  const runSync = async () => {
    setElapsedSec(0);
    setSyncState("loading");
    setSyncErrorCode(undefined);
    try {
      const result = await syncStrava.mutateAsync();
      setSyncedCount(result.synced);
      setSyncState("success");
      setTimeout(goToDashboard, 600);
    } catch (err) {
      const code =
        err instanceof SyncMutationError ? err.code : "sync_failed";
      if (code === "sync_in_progress") {
        // Race with concurrent sync — just go to dashboard.
        goToDashboard();
        return;
      }
      setSyncErrorCode(code);
      setSyncState("error");
    }
  };

  const onFinish = async () => {
    try {
      await finalize.mutateAsync(autoShare);
    } catch {
      return;
    }
    void runSync();
  };

  return (
    <div style={containerStyle}>
      <div className="mx-auto w-full max-w-[920px] px-5 py-8 md:px-10 md:py-14">
        <div className="mb-10 flex flex-wrap items-center gap-2.5">
          <Wordmark size="md" accent={accent} tone="dark" />
          <div className="ml-auto">
            <StepProgress current={step} total={TOTAL_STEPS} accent={accent} />
          </div>
        </div>

        {step === 0 && (
          <OnboardingStep
            step={1}
            total={TOTAL_STEPS}
            heading="Upload your photo."
            description={
              <>
                We&apos;ll stylize it as a duotone cutout for your milestone
                cards. Action shots work best — clear subject, simple
                background.
              </>
            }
            footer={
              <>
                <Button variant="text" onClick={() => setStep(1)}>
                  skip for now
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setStep(1)}
                  disabled={uploadAvatar.isPending}
                >
                  Continue <Icon name="arrowRight" size={16} />
                </Button>
              </>
            }
          >
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-6">
              <PhotoUpload
                accent={accent}
                hasPhoto={hasPhoto}
                uploading={uploadAvatar.isPending}
                errorMessage={photoError}
                onSelectFile={onSelectFile}
              />
              <DuotonePreview src={photoPreview} />
            </div>
          </OnboardingStep>
        )}

        {step === 1 && (
          <OnboardingStep
            step={2}
            total={TOTAL_STEPS}
            heading={`Set your ${new Date().getUTCFullYear()} goals.`}
            description={
              <>
                Each goal generates a milestone when you hit it. We&apos;ll
                also nudge you on pace progress.
              </>
            }
            footer={
              <>
                <Button variant="ghostLight" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={onContinueGoals}
                  disabled={saveGoals.isPending}
                >
                  {saveGoals.isPending ? "Saving…" : "Continue"}{" "}
                  <Icon name="arrowRight" size={16} />
                </Button>
              </>
            }
          >
            <GoalSetting
              accent={accent}
              values={goalValues}
              fieldErrors={fieldErrors}
              onChange={(key, value) =>
                setGoalValues((prev) => ({ ...prev, [key]: value }))
              }
            />
            {goalSaveError && (
              <FieldError style={{ marginTop: 12 }}>{goalSaveError}</FieldError>
            )}
          </OnboardingStep>
        )}

        {step === 2 && (
          <OnboardingStep
            step={3}
            total={TOTAL_STEPS}
            heading="Auto-share?"
            description={
              <>
                When you hit a milestone, generate a share card automatically.
              </>
            }
            footer={
              syncState ? null : (
                <>
                  <Button variant="ghostLight" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={onFinish}
                    disabled={finalize.isPending}
                  >
                    {finalize.isPending ? "Saving…" : "Open dashboard"}{" "}
                    <Icon name="arrowRight" size={16} />
                  </Button>
                </>
              )
            }
          >
            {syncState ? (
              <SyncStatusInline
                state={syncState}
                syncedCount={syncedCount}
                elapsedSec={syncState === "loading" ? elapsedSec : undefined}
                errorCode={syncErrorCode}
                onRetry={runSync}
                onSkip={goToDashboard}
                retryPending={syncStrava.isPending}
              />
            ) : (
              <>
                <AutoSharePrefs
                  accent={accent}
                  values={autoShare}
                  onChange={onAutoShareChange}
                />
                {finalize.error && (
                  <FieldError style={{ marginTop: 12 }}>
                    {humanizeFinalizeError(finalize.error.message)}
                  </FieldError>
                )}
              </>
            )}
          </OnboardingStep>
        )}
      </div>
    </div>
  );
}
