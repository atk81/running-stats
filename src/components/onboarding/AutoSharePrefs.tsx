"use client";

import type { CSSProperties } from "react";

export interface AutoShareValues {
  autoSharePR: boolean;
  autoShareVolume: boolean;
  autoShareWeeklyRecap: boolean;
}

export type AutoShareKey = keyof AutoShareValues;

export interface AutoShareOption {
  key: AutoShareKey;
  label: string;
}

export const AUTO_SHARE_OPTIONS: AutoShareOption[] = [
  { key: "autoSharePR", label: "Auto-share when you set a new PR" },
  { key: "autoShareVolume", label: "Auto-share volume milestones" },
  { key: "autoShareWeeklyRecap", label: "Auto-share a weekly recap" },
];

export interface AutoSharePrefsProps {
  accent: string;
  values: AutoShareValues;
  onChange: (key: AutoShareKey, next: boolean) => void;
}

const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontFamily: "var(--font-body)",
  fontSize: 14,
  color: "var(--ink)",
  cursor: "pointer",
};

export function AutoSharePrefs({ accent, values, onChange }: AutoSharePrefsProps) {
  return (
    <div style={cardStyle}>
      {AUTO_SHARE_OPTIONS.map((opt) => (
        <label key={opt.key} style={rowStyle}>
          <input
            type="checkbox"
            checked={values[opt.key]}
            onChange={(e) => onChange(opt.key, e.target.checked)}
            style={{ accentColor: accent, width: 16, height: 16 }}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
