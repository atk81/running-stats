"use client";

import type { CSSProperties } from "react";
import { Icon, Input } from "@/components/primitives";
import type { GoalKey } from "@/lib/goals/defaults";

export interface GoalFormState {
  k5: string;
  k10: string;
  hm: string;
  volume: string;
}

export interface GoalSettingProps {
  accent: string;
  values: GoalFormState;
  fieldErrors: Partial<Record<GoalKey, string>>;
  saveError: string | null;
  onChange: (key: GoalKey, value: string) => void;
}

const nudgeStyle: CSSProperties = {
  marginTop: 20,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const errorTextStyle: CSSProperties = {
  marginTop: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ignite-deep)",
};

export function GoalSetting({
  accent,
  values,
  fieldErrors,
  saveError,
  onChange,
}: GoalSettingProps) {
  const renderField = (
    key: GoalKey,
    label: string,
    suffix: string,
    focused = false,
  ) => (
    <div>
      <Input
        label={label}
        value={values[key]}
        mono
        suffix={suffix}
        focused={focused}
        onChange={(e) => onChange(key, e.target.value)}
      />
      {fieldErrors[key] && <div style={errorTextStyle}>{fieldErrors[key]}</div>}
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {renderField("k5", "5K time", "min")}
        {renderField("k10", "10K time", "min")}
        {renderField("hm", "Half marathon", "h")}
        {renderField("volume", "Yearly volume", "km", true)}
      </div>
      <div style={nudgeStyle}>
        <Icon name="sparkle" size={18} color={accent} />
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--fg-2)",
          }}
        >
          We&apos;ll calibrate your nudges once we have your last 90 days of
          activity. For now, edit these to whatever feels right.
        </div>
      </div>
      {saveError && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ignite-deep)",
          }}
        >
          {saveError}
        </div>
      )}
    </div>
  );
}
