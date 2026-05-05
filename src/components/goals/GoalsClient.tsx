"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, Label, Pill, ProgressBar } from "@/components/primitives";
import { PageError, PageLoading } from "@/components/chrome/PageStatus";
import { useGoals } from "@/lib/hooks/useGoals";
import { useUser } from "@/lib/hooks/useUser";
import {
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
import { formatApiError } from "@/lib/api/errors";

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
  { label: "Blank · custom", name: "Custom goal", type: "time", targetValue: "0:00", distanceLabel: "" },
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

  function openEditor(id: string) {
    updateGoal.reset();
    setEditingId(id);
  }
  function closeEditor() {
    updateGoal.reset();
    setEditingId(null);
  }
  function openModal() {
    createGoal.reset();
    setShowAdd(true);
  }
  function closeModal() {
    createGoal.reset();
    setShowAdd(false);
  }

  if (goalsQuery.isLoading) return <PageLoading label="Loading goals…" />;
  if (goalsQuery.isError) {
    return (
      <PageError
        title="Goals failed to load"
        description="Could not fetch your goals."
        onRetry={() => void goalsQuery.refetch()}
      />
    );
  }

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
              key={`${g.$id}:${g.$updatedAt}`}
              goal={g}
              accent={accent}
              editing={editingId === g.$id}
              onEdit={() => openEditor(g.$id)}
              onCancel={closeEditor}
              onSave={(targetValue) => {
                if (targetValue !== g.targetValue) {
                  updateGoal.mutate({ id: g.$id, patch: { targetValue } });
                }
                closeEditor();
              }}
              saveError={editingId === g.$id ? formatApiError(updateGoal.error) : null}
            />
          ))}
          {customs.map((g) => (
            <CustomCard
              key={`${g.$id}:${g.$updatedAt}`}
              goal={g}
              accent={accent}
              editing={editingId === g.$id}
              onEdit={() => openEditor(g.$id)}
              onCancel={closeEditor}
              onSave={(patch) => {
                const minimal = diffPatch(g, patch);
                if (Object.keys(minimal).length > 0) {
                  updateGoal.mutate({ id: g.$id, patch: minimal });
                }
                closeEditor();
              }}
              onDelete={() => {
                if (!window.confirm(`Delete "${g.name}"? This can't be undone.`)) return;
                deleteGoal.mutate(g.$id);
                if (editingId === g.$id) closeEditor();
              }}
              saveError={editingId === g.$id ? formatApiError(updateGoal.error) : null}
            />
          ))}
          <AddGoalTile accent={accent} onClick={openModal} />
        </div>
      </div>

      {showAdd && (
        <AddGoalModal
          onClose={closeModal}
          onPick={(tmpl) => {
            createGoal.mutate(
              {
                name: tmpl.name,
                distanceLabel: tmpl.distanceLabel,
                type: tmpl.type,
                targetValue: tmpl.targetValue,
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
          error={formatApiError(createGoal.error)}
        />
      )}
    </div>
  );
}

interface CustomPatch {
  name: string;
  distanceLabel: string;
  type: GoalType;
  targetValue: string;
}

function diffPatch(g: GoalRow, p: CustomPatch): Partial<CustomPatch> {
  const out: Partial<CustomPatch> = {};
  const trimmedDist = p.distanceLabel.trim();
  if (p.name !== g.name) out.name = p.name;
  if (trimmedDist !== (g.distanceLabel ?? "")) out.distanceLabel = trimmedDist;
  if (p.type !== (g.type as GoalType)) out.type = p.type;
  if (p.targetValue !== g.targetValue) out.targetValue = p.targetValue;
  return out;
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

interface BuiltinCardProps {
  goal: GoalRow;
  accent: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (targetValue: string) => void;
  saveError: string | null;
}

function BuiltinCard({ goal, accent, editing, onEdit, onCancel, onSave, saveError }: BuiltinCardProps) {
  const meta = BUILTIN_GOAL_META[goal.goalKey as GoalKey];
  const [draft, setDraft] = useState(goal.targetValue);

  return (
    <GoalCardShell
      title={meta.name}
      sub={meta.distanceLabel}
      accent={accent}
      editing={editing}
      onEdit={onEdit}
      onSave={() => onSave(draft)}
      onCancel={onCancel}
    >
      {editing ? (
        <EditFields>
          <FieldBlock label="Target">
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
          </FieldBlock>
          <HelpLine text={TYPE_HELP[meta.type]} />
          {saveError && <ErrorLine text={saveError} />}
        </EditFields>
      ) : (
        <ReadView
          accent={accent}
          target={goal.targetValue}
          suffix={TYPE_SUFFIX[meta.type]}
          percentage={goal.percentage ?? 0}
          done={goal.done}
          current={goal.currentValue}
          fontSize={56}
          suffixUppercase={false}
        />
      )}
    </GoalCardShell>
  );
}

interface CustomCardProps {
  goal: GoalRow;
  accent: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: CustomPatch) => void;
  onDelete: () => void;
  saveError: string | null;
}

function CustomCard({ goal, accent, editing, onEdit, onCancel, onSave, onDelete, saveError }: CustomCardProps) {
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
      onSave={() => onSave({ name, distanceLabel, type, targetValue })}
      onCancel={onCancel}
      onDelete={onDelete}
    >
      {editing ? (
        <EditFields>
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
          <HelpLine text={TYPE_HELP[type]} />
          {saveError && <ErrorLine text={saveError} />}
        </EditFields>
      ) : (
        <ReadView
          accent={accent}
          target={goal.targetValue || "—"}
          suffix={goalType.toUpperCase()}
          percentage={goal.percentage ?? 0}
          done={goal.done}
          current={goal.currentValue}
          fontSize={46}
          suffixUppercase
        />
      )}
    </GoalCardShell>
  );
}

interface GoalCardShellProps {
  title: string;
  sub: string;
  accent: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  children: ReactNode;
}

function GoalCardShell({
  title,
  sub,
  accent,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  children,
}: GoalCardShellProps) {
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
          {editing && (
            <button onClick={onCancel} aria-label="Cancel edit" style={iconButtonStyle}>
              <Icon name="close" size={12} />
            </button>
          )}
          {!editing && onDelete && (
            <button onClick={onDelete} aria-label="Delete goal" title="Delete goal" style={iconButtonStyle}>
              <Icon name="close" size={12} />
            </button>
          )}
          <button onClick={editing ? onSave : onEdit} style={editButtonStyle(editing, accent)}>
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function EditFields({ children }: { children: ReactNode }) {
  return <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
}

function HelpLine({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-4)" }}>
      {text}
    </div>
  );
}

interface ReadViewProps {
  accent: string;
  target: string;
  suffix: string;
  percentage: number;
  done: boolean;
  current?: string;
  fontSize: number;
  suffixUppercase: boolean;
}

function ReadView({ accent, target, suffix, percentage, done, current, fontSize, suffixUppercase }: ReadViewProps) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize,
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
            textTransform: suffixUppercase ? "uppercase" : "none",
            letterSpacing: suffixUppercase ? "0.1em" : 0,
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
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>
          {current && current !== "—"
            ? `current · ${current} (${percentage}%)${done ? " · done" : ""}`
            : "not yet started — milestones unlock once progress starts"}
        </span>
        {done && <Pill tone="pulse">DONE</Pill>}
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
  const inflightRef = useRef(false);

  function handlePick(tmpl: PresetTemplate) {
    if (inflightRef.current || submitting) return;
    inflightRef.current = true;
    onPick(tmpl);
    queueMicrotask(() => {
      inflightRef.current = false;
    });
  }

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
              onClick={() => handlePick(p)}
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
