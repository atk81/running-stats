"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button, FieldError, Icon } from "@/components/primitives";
import { Wordmark } from "@/components/chrome/Wordmark";
import { DuotonePreview } from "./DuotonePreview";
import { GoalFormState, GoalSetting } from "./GoalSetting";
import { OnboardingStep } from "./OnboardingStep";
import { PhotoUpload } from "./PhotoUpload";
import { StepProgress } from "./StepProgress";
import {
  BUILTIN_GOAL_META,
  type GoalKey,
} from "@/lib/goals/defaults";
import {
  GoalsValidationError,
  validateGoalInputs,
} from "@/lib/goals/validate";
import {
  useSaveGoals,
  useUploadAvatar,
} from "@/lib/hooks/useOnboardingMutations";

export interface OnboardingInitialGoal {
  goalKey: GoalKey;
  targetValue: string;
}

export interface OnboardingClientProps {
  accentColor: string;
  initialAvatarFileId: string;
  initialGoals: OnboardingInitialGoal[];
}

const TOTAL_STEPS = 3;

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bone)",
  color: "var(--ink)",
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

export function OnboardingClient({
  accentColor: accent,
  initialAvatarFileId,
  initialGoals,
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

  const uploadAvatar = useUploadAvatar();
  const saveGoals = useSaveGoals();

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

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

  return (
    <div style={containerStyle}>
      <div className="rs-onboard-shell">
        <div className="rs-onboard-header">
          <Wordmark size="md" accent={accent} tone="dark" />
          <div style={{ marginLeft: "auto" }}>
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
            <div className="rs-onboard-photo-grid">
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
            heading="Almost done."
            description={
              <>
                Auto-share preferences land in the next update. For now, your
                photo and goals are saved — you can open the dashboard from
                the connect page.
              </>
            }
            footer={
              <>
                <Button variant="ghostLight" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="dark" onClick={() => router.push("/")}>
                  Return home
                </Button>
              </>
            }
          >
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 20,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
              }}
            >
              Step 3 — auto-share preferences — coming soon.
            </div>
          </OnboardingStep>
        )}
      </div>
    </div>
  );
}
