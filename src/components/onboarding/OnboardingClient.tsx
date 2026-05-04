"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, Label } from "@/components/primitives";
import { Wordmark } from "@/components/chrome/Wordmark";
import { DuotonePreview } from "./DuotonePreview";
import { GoalFormState, GoalSetting } from "./GoalSetting";
import { PhotoUpload } from "./PhotoUpload";
import { StepProgress } from "./StepProgress";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";
import {
  BUILTIN_GOAL_META,
  type GoalKey,
} from "@/lib/goals/defaults";
import { parseTimeToSeconds } from "@/lib/onboarding/timeFormat";
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

const containerStyle: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bone)",
  color: "var(--ink)",
};

const innerStyle: CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "56px 40px",
};

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 54,
  lineHeight: 1.05,
  letterSpacing: "-0.01em",
  margin: "8px 0 12px",
  color: "var(--ink)",
};

const subheadingStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--fg-3)",
  fontSize: 16,
  maxWidth: 520,
  lineHeight: 1.5,
};

const stepFooterStyle: CSSProperties = {
  marginTop: 32,
  display: "flex",
  gap: 12,
  justifyContent: "flex-end",
};

function buildInitialGoalForm(rows: OnboardingInitialGoal[]): GoalFormState {
  const seeded: GoalFormState = {
    k5: BUILTIN_GOAL_META.k5.defaultTarget,
    k10: BUILTIN_GOAL_META.k10.defaultTarget,
    hm: BUILTIN_GOAL_META.hm.defaultTarget,
    volume: BUILTIN_GOAL_META.volume.defaultTarget,
  };
  for (const row of rows) {
    if (row.goalKey in seeded) {
      seeded[row.goalKey] = row.targetValue;
    }
  }
  return seeded;
}

export function OnboardingClient({
  accentColor,
  initialAvatarFileId,
  initialGoals,
}: OnboardingClientProps) {
  const router = useRouter();
  const accent = accentColor || DEFAULT_ACCENT_COLOR;
  const [step, setStep] = useState(0);
  const [avatarFileId, setAvatarFileId] = useState(initialAvatarFileId);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [goalValues, setGoalValues] = useState<GoalFormState>(() =>
    buildInitialGoalForm(initialGoals),
  );
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<GoalKey, string>>>(
    {},
  );

  const uploadAvatar = useUploadAvatar();
  const saveGoals = useSaveGoals();

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const onSelectFile = async (file: File) => {
    setPhotoError(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    try {
      const result = await uploadAvatar.mutateAsync(file);
      setAvatarFileId(result.avatarFileId);
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "Avatar upload failed.",
      );
    }
  };

  const validateGoalsClientSide = (): Partial<Record<GoalKey, string>> => {
    const errs: Partial<Record<GoalKey, string>> = {};
    for (const key of ["k5", "k10", "hm"] as const) {
      if (parseTimeToSeconds(goalValues[key]) === null) {
        errs[key] = "use mm:ss or hh:mm:ss";
      }
    }
    const v = Number(goalValues.volume);
    if (!Number.isFinite(v) || v <= 0) {
      errs.volume = "must be a positive number (km)";
    }
    return errs;
  };

  const onContinueGoals = async () => {
    const errs = validateGoalsClientSide();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    try {
      await saveGoals.mutateAsync(goalValues);
      setStep(2);
    } catch (err) {
      const fieldList =
        err instanceof Error
          ? (err as Error & { fieldErrors?: { field: string; message: string }[] })
              .fieldErrors
          : undefined;
      if (fieldList && fieldList.length > 0) {
        const next: Partial<Record<GoalKey, string>> = {};
        for (const f of fieldList) {
          next[f.field as GoalKey] = f.message;
        }
        setFieldErrors(next);
      }
    }
  };

  const goalSaveError = useMemo(() => {
    if (!saveGoals.error) return null;
    const fieldList = (saveGoals.error as Error & {
      fieldErrors?: { field: string; message: string }[];
    }).fieldErrors;
    if (fieldList && fieldList.length > 0) return null;
    return saveGoals.error.message;
  }, [saveGoals.error]);

  const hasPhoto = Boolean(avatarFileId || photoPreview);

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 40,
          }}
        >
          <Wordmark size="md" accent={accent} />
          <div style={{ marginLeft: "auto" }}>
            <StepProgress current={step} total={3} accent={accent} />
          </div>
        </div>

        {step === 0 && (
          <section style={{ animation: "rs-fade-in 280ms var(--ease-out)" }}>
            <Label>Step 1 of 3</Label>
            <h1 style={headingStyle}>Upload your photo.</h1>
            <p style={subheadingStyle}>
              We&apos;ll stylize it as a duotone cutout for your milestone
              cards. Action shots work best — clear subject, simple background.
            </p>
            <div
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                alignItems: "stretch",
              }}
            >
              <PhotoUpload
                accent={accent}
                hasPhoto={hasPhoto}
                uploading={uploadAvatar.isPending}
                errorMessage={photoError}
                onSelectFile={onSelectFile}
              />
              <DuotonePreview src={photoPreview} />
            </div>
            <div style={stepFooterStyle}>
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
            </div>
          </section>
        )}

        {step === 1 && (
          <section style={{ animation: "rs-fade-in 280ms var(--ease-out)" }}>
            <Label>Step 2 of 3</Label>
            <h1 style={headingStyle}>
              Set your {new Date().getUTCFullYear()} goals.
            </h1>
            <p style={subheadingStyle}>
              Each goal generates a milestone when you hit it. We&apos;ll also
              nudge you on pace progress.
            </p>
            <div style={{ marginTop: 32 }}>
              <GoalSetting
                accent={accent}
                values={goalValues}
                fieldErrors={fieldErrors}
                saveError={goalSaveError}
                onChange={(key, value) =>
                  setGoalValues((prev) => ({ ...prev, [key]: value }))
                }
              />
            </div>
            <div style={stepFooterStyle}>
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
            </div>
          </section>
        )}

        {step === 2 && (
          <section style={{ animation: "rs-fade-in 280ms var(--ease-out)" }}>
            <Label>Step 3 of 3</Label>
            <h1 style={headingStyle}>Almost done.</h1>
            <p style={subheadingStyle}>
              Auto-share preferences land in the next update. For now, your
              photo and goals are saved — you can open the dashboard from the
              connect page.
            </p>
            <div
              style={{
                marginTop: 32,
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
            <div style={stepFooterStyle}>
              <Button variant="ghostLight" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="dark" onClick={() => router.push("/")}>
                Return home
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
