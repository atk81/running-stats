"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button, Icon, Label, Pill, ProgressBar } from "@/components/primitives";
import { useGoals } from "@/lib/hooks/useGoals";
import { useUser } from "@/lib/hooks/useUser";
import {
  GoalMutationError,
  useCreateCustomGoal,
  useDeleteGoal,
  useUpdateGoal,
} from "@/lib/hooks/useGoalMutations";
import {
  BUILTIN_GOAL_KEYS,
  BUILTIN_GOAL_META,
  isCustomGoalKey,
  type GoalKey,
  type GoalType,
} from "@/lib/goals/defaults";
import type { GoalRow } from "@/lib/goals/types";

interface PresetTemplate {
  label: string;
  name: string;
  type: GoalType;
  targetValue: string;
  distanceLabel: string;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  { label: "Marathon · sub 4:00", name: "Marathon", type: "time", targetValue: "4:00:00", distanceLabel: "42.2 km" },
  { label: "Marathon · finish", name: "Marathon finish", type: "complete", targetValue: "finish", distanceLabel: "42.2 km" },
  { label: "Ultra · 50K", name: "Ultra 50K", type: "time", targetValue: "5:30:00", distanceLabel: "50 km" },
  { label: "Ultra · 50K finish", name: "Ultra 50K finish", type: "complete", targetValue: "finish", distanceLabel: "50 km" },
  { label: "Ultra · 100K finish", name: "Ultra 100K", type: "complete", targetValue: "finish", distanceLabel: "100 km" },
  { label: "Monthly · 100 km", name: "Monthly 100 km", type: "volume", targetValue: "100", distanceLabel: "per month" },
  { label: "Streak · 30 days", name: "30-day streak", type: "count", targetValue: "30", distanceLabel: "days in a row" },
  { label: "Blank · custom", name: "Custom goal", type: "time", targetValue: "", distanceLabel: "" },
];

const TYPE_SUFFIX: Record<GoalType, string> = {
  time: "min",
  volume: "km",
  complete: "",
  count: "",
};

const TYPE_HELP: Record<GoalType, string> = {
  time: "format: mm:ss or h:mm:ss",
  volume: "format: km total",
  complete: "no target — just finish",
  count: "format: integer",
};

export function GoalsClient() {
  const { user } = useUser();
  const accent = user?.accentColor || "var(--ignite)";
  const year = new Date().getUTCFullYear();
  const goalsQuery = useGoals(year);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const createGoal = useCreateCustomGoal();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { builtins, customs } = useMemo(
    () => splitGoals(goalsQuery.data?.goals ?? []),
    [goalsQuery.data],
  );

  if (goalsQuery.isLoading) return <PageLoading />;
  if (goalsQuery.isError) return <PageError onRetry={() => void goalsQuery.refetch()} />;

  return (
    <div style={{ background: "var(--ink)", color: "var(--bone)", minHeight: "calc(100vh - 56px)" }}>
      <div
        className="md:px-8"
        style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}
      >
        <header style={{ marginBottom: 24 }}>
          <Label style={{ color: "var(--fg-3)" }}>Goals · {year}</Label>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 40,
              fontWeight: 700,
              color: "var(--bone)",
              margin: "8px 0 4px",
            }}
          >
            Your targets
          </h1>
          <p style={{ fontFamily: "Inter", fontSize: 14, color: "var(--fg-3)", margin: 0 }}>
            Tap <span style={{ color: "var(--bone)", fontWeight: 600 }}>edit</span> on any goal to
            change the target. Add races, ultras, streaks, or anything else you&apos;re chasing.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          {builtins.map((g) => (
            <BuiltinCard
              key={g.$id}
              goal={g}
              accent={accent}
              editing={editingId === g.$id}
              onEdit={() => setEditingId(g.$id)}
              onDone={() => setEditingId(null)}
              onSave={(targetValue) => {
                updateGoal.mutate({ id: g.$id, patch: { targetValue } });
                setEditingId(null);
              }}
              saveError={editingId === g.$id ? extractError(updateGoal.error) : null}
            />
          ))}
          {customs.map((g) => (
            <CustomCard
              key={g.$id}
              goal={g}
              accent={accent}
              editing={editingId === g.$id}
              onEdit={() => setEditingId(g.$id)}
              onDone={() => setEditingId(null)}
              onSave={(patch) => {
                updateGoal.mutate({ id: g.$id, patch });
                setEditingId(null);
              }}
              onDelete={() => {
                deleteGoal.mutate(g.$id);
                if (editingId === g.$id) setEditingId(null);
              }}
              saveError={editingId === g.$id ? extractError(updateGoal.error) : null}
            />
          ))}
          <AddGoalTile accent={accent} onClick={() => setShowAdd(true)} />
        </div>
      </div>

      {showAdd && (
        <AddGoalModal
          onClose={() => setShowAdd(false)}
          onPick={(tmpl) => {
            createGoal.mutate(
              {
                name: tmpl.name,
                distanceLabel: tmpl.distanceLabel,
                type: tmpl.type,
                targetValue: tmpl.targetValue || (tmpl.type === "complete" ? "finish" : "0"),
              },
              {
                onSuccess: (row) => {
                  setShowAdd(false);
                  setEditingId(row.$id);
                },
              },
            );
          }}
          submitting={createGoal.isPending}
          error={extractError(createGoal.error)}
        />
      )}
    </div>
  );
}

function splitGoals(rows: GoalRow[]): { builtins: GoalRow[]; customs: GoalRow[] } {
  const builtinByKey = new Map<GoalKey, GoalRow>();
  const customs: GoalRow[] = [];
  for (const row of rows) {
    if (row.isBuiltin && (BUILTIN_GOAL_KEYS as readonly string[]).includes(row.goalKey)) {
      builtinByKey.set(row.goalKey as GoalKey, row);
    } else if (isCustomGoalKey(row.goalKey)) {
      customs.push(row);
    }
  }
  const builtins = BUILTIN_GOAL_KEYS.map((k) => builtinByKey.get(k)).filter(
    (r): r is GoalRow => Boolean(r),
  );
  return { builtins, customs };
}

function extractError(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof GoalMutationError) {
    if (err.details && err.details.length > 0) {
      return err.details.map((d) => `${d.field}: ${d.message}`).join(" · ");
    }
    return err.message;
  }
  return null;
}

interface BuiltinCardProps {
  goal: GoalRow;
  accent: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onSave: (targetValue: string) => void;
  saveError: string | null;
}

function BuiltinCard({ goal, accent, editing, onEdit, onDone, onSave, saveError }: BuiltinCardProps) {
  const meta = BUILTIN_GOAL_META[goal.goalKey as GoalKey];
  const [draft, setDraft] = useState(goal.targetValue);

  return (
    <GoalCardShell
      title={meta.name}
      sub={meta.distanceLabel}
      accent={accent}
      editing={editing}
      onEdit={onEdit}
      onDone={editing ? () => onSave(draft) : onDone}
    >
      {editing ? (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <Label style={{ color: "var(--fg-3)" }}>Target</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              style={editInputStyle(accent)}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>
              {TYPE_SUFFIX[meta.type]}
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-4)" }}>
            {TYPE_HELP[meta.type]}
          </div>
          {saveError && <ErrorLine text={saveError} />}
        </div>
      ) : (
        <ReadView accent={accent} target={goal.targetValue} suffix={TYPE_SUFFIX[meta.type]} percentage={goal.percentage ?? 0} done={goal.done} current={goal.currentValue} kind="time-or-volume" />
      )}
    </GoalCardShell>
  );
}

interface CustomCardProps {
  goal: GoalRow;
  accent: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onSave: (patch: { name: string; distanceLabel: string; type: GoalType; targetValue: string }) => void;
  onDelete: () => void;
  saveError: string | null;
}

function CustomCard({ goal, accent, editing, onEdit, onDone, onSave, onDelete, saveError }: CustomCardProps) {
  const goalType = (goal.type as GoalType) ?? "time";
  const [name, setName] = useState(goal.name);
  const [distanceLabel, setDistanceLabel] = useState(goal.distanceLabel ?? "");
  const [type, setType] = useState<GoalType>(goalType);
  const [targetValue, setTargetValue] = useState(goal.targetValue);

  return (
    <GoalCardShell
      title={goal.name}
      sub={goal.distanceLabel ?? ""}
      accent={accent}
      editing={editing}
      onEdit={onEdit}
      onDone={editing ? () => onSave({ name, distanceLabel, type, targetValue }) : onDone}
      onDelete={onDelete}
    >
      {editing ? (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <FieldBlock label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} style={textInputStyle} />
          </FieldBlock>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FieldBlock label="Distance / unit">
              <input
                value={distanceLabel}
                onChange={(e) => setDistanceLabel(e.target.value)}
                placeholder="42.2 km"
                style={textInputStyle}
              />
            </FieldBlock>
            <FieldBlock label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as GoalType)}
                style={textInputStyle}
              >
                <option value="time">Time (h:mm:ss)</option>
                <option value="complete">Just finish</option>
                <option value="volume">Volume (km)</option>
                <option value="count">Count (days/runs)</option>
              </select>
            </FieldBlock>
          </div>
          <FieldBlock label="Target">
            <input
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={
                type === "time" ? "4:00:00" : type === "complete" ? "finish" : type === "volume" ? "100" : "30"
              }
              style={editInputStyle(accent)}
            />
          </FieldBlock>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-4)" }}>
            {TYPE_HELP[type]}
          </div>
          {saveError && <ErrorLine text={saveError} />}
        </div>
      ) : (
        <ReadView
          accent={accent}
          target={goal.targetValue || "—"}
          suffix={goalType.toUpperCase()}
          percentage={goal.percentage ?? 0}
          done={goal.done}
          current={goal.currentValue}
          kind="custom"
        />
      )}
    </GoalCardShell>
  );
}

function GoalCardShell({
  title,
  sub,
  accent,
  editing,
  onEdit,
  onDone,
  onDelete,
  children,
}: {
  title: string;
  sub: string;
  accent: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--ink-2)",
        border: editing ? `1.5px solid ${accent}` : "1px solid var(--ink-3)",
        borderRadius: 16,
        padding: 20,
        transition: "border-color 120ms",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Label style={{ color: "var(--fg-3)" }}>{title}</Label>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-4)",
              marginTop: 4,
            }}
          >
            {sub}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete goal"
              aria-label="Delete goal"
              style={iconButtonStyle}
            >
              <Icon name="close" size={12} />
            </button>
          )}
          <button onClick={onDone} style={editButtonStyle(editing, accent)}>
            {editing ? "Done" : "Edit"}
          </button>
          {!editing && onEdit !== onDone && null}
        </div>
      </div>
      {children}
    </div>
  );
}

function ReadView({
  accent,
  target,
  suffix,
  percentage,
  done,
  current,
  kind,
}: {
  accent: string;
  target: string;
  suffix: string;
  percentage: number;
  done: boolean;
  current?: string;
  kind: "time-or-volume" | "custom";
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: kind === "custom" ? 46 : 56,
            letterSpacing: "-0.02em",
            color: "var(--bone)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {target}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-3)",
            textTransform: kind === "custom" ? "uppercase" : "none",
            letterSpacing: kind === "custom" ? "0.1em" : 0,
          }}
        >
          {suffix}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <ProgressBar value={percentage} color={done ? "var(--pulse)" : accent} bg="var(--ink)" />
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-3)",
          marginTop: 8,
        }}
      >
        {current && current !== "—"
          ? `current · ${current} (${percentage}%)${done ? " · done" : ""}`
          : "not yet started — milestones unlock once progress starts"}
        {done && <Pill tone="pulse" style={{ marginLeft: 8 }}>DONE</Pill>}
      </div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label style={{ color: "var(--fg-3)", marginBottom: 6, display: "block" }}>{label}</Label>
      {children}
    </div>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <div
      role="alert"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--amber-deep, var(--amber))",
      }}
    >
      {text}
    </div>
  );
}

function AddGoalTile({ accent, onClick }: { accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "1.5px dashed var(--ink-3)",
        borderRadius: 16,
        padding: "28px 20px",
        color: "var(--fg-3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontFamily: "Inter",
        fontSize: 14,
        minHeight: 180,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.color = "var(--bone)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ink-3)";
        e.currentTarget.style.color = "var(--fg-3)";
      }}
    >
      <Icon name="plus" size={16} /> Add a goal — marathon, ultra, streak, anything
    </button>
  );
}

function AddGoalModal({
  onClose,
  onPick,
  submitting,
  error,
}: {
  onClose: () => void;
  onPick: (tmpl: PresetTemplate) => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        background: "rgba(5,7,10,0.72)",
        backdropFilter: "blur(8px)",
        display: "grid",
        placeItems: "center",
        animation: "rs-fade-in-no-move 200ms",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="New goal"
        style={{
          width: "min(640px, 92vw)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--ink-2)",
          border: "1px solid var(--ink-3)",
          borderRadius: 20,
          padding: 28,
          color: "var(--bone)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <Label style={{ color: "var(--fg-3)" }}>New goal</Label>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 28,
                fontWeight: 700,
                margin: "6px 0 0",
              }}
            >
              Pick a preset or start blank
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={iconButtonStyle}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
          {PRESET_TEMPLATES.map((p) => (
            <button
              key={p.label}
              onClick={() => onPick(p)}
              disabled={submitting}
              style={presetButtonStyle}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                <Icon name="arrowRight" size={14} color="var(--fg-3)" />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
                {p.distanceLabel}
                {p.targetValue && p.type !== "complete" ? ` · ${p.targetValue}` : ""}
              </div>
            </button>
          ))}
        </div>
        {error && <div style={{ marginTop: 12 }}><ErrorLine text={error} /></div>}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-4)",
            marginTop: 16,
            lineHeight: 1.5,
          }}
        >
          Each custom goal produces its own milestone card when you make progress or complete it.
        </div>
      </div>
    </div>
  );
}

const textInputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  background: "var(--ink)",
  border: "1px solid var(--ink-3)",
  color: "var(--bone)",
  fontFamily: "Inter",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
} as const;

function editInputStyle(accent: string) {
  return {
    flex: 1,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    background: "var(--ink)",
    border: `1px solid ${accent}`,
    color: "var(--bone)",
    fontFamily: "var(--font-mono)",
    fontSize: 18,
    outline: "none",
    fontVariantNumeric: "tabular-nums",
    boxSizing: "border-box",
  } as const;
}

function editButtonStyle(editing: boolean, accent: string) {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    background: editing ? accent : "transparent",
    border: editing ? "none" : "1px solid var(--ink-3)",
    color: editing ? "#fff" : "var(--fg-3)",
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    cursor: "pointer",
  } as const;
}

const iconButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 999,
  background: "transparent",
  border: "1px solid var(--ink-3)",
  color: "var(--fg-3)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
} as const;

const presetButtonStyle = {
  textAlign: "left",
  background: "var(--ink)",
  border: "1px solid var(--ink-3)",
  borderRadius: 12,
  padding: 14,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "var(--bone)",
  transition: "border-color 120ms, transform 120ms",
} as const;

function PageLoading() {
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--fg-3)",
        minHeight: "calc(100vh - 56px)",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      Loading goals…
    </div>
  );
}

function PageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        background: "var(--ink)",
        color: "var(--bone)",
        minHeight: "calc(100vh - 56px)",
        display: "grid",
        placeItems: "center",
        padding: 32,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Goals failed to load
        </div>
        <Button variant="primary" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Retry
        </Button>
      </div>
    </div>
  );
}
