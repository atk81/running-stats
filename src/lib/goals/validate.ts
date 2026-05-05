import {
  BUILTIN_GOAL_KEYS,
  GOAL_TYPES,
  isGoalType,
  type GoalKey,
  type GoalType,
} from "./defaults";
import { parseTimeToSeconds } from "@/lib/utils/timeFormat";

export interface GoalFieldError {
  field: string;
  message: string;
}

export interface GoalInput {
  targetValue: string | number;
}

export type GoalInputMap = Record<GoalKey, GoalInput>;

const NAME_MAX = 128;
const DIST_LABEL_MAX = 64;
const TARGET_VALUE_MAX = 32;

export function validateGoalInputs(
  values: Partial<GoalInputMap>,
): GoalFieldError[] {
  const errors: GoalFieldError[] = [];
  for (const key of BUILTIN_GOAL_KEYS) {
    const entry = values[key];
    if (!entry || typeof entry.targetValue === "undefined") {
      errors.push({ field: key, message: "missing" });
      continue;
    }
    if (key === "volume") {
      const raw = entry.targetValue;
      const num = typeof raw === "string" ? Number(raw) : raw;
      if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) {
        errors.push({ field: key, message: "must be a positive number (km)" });
      }
    } else {
      const raw = entry.targetValue;
      if (typeof raw !== "string" || parseTimeToSeconds(raw) === null) {
        errors.push({ field: key, message: "use mm:ss or hh:mm:ss" });
      }
    }
  }
  return errors;
}

export interface CustomGoalInput {
  name: string;
  distanceLabel?: string;
  type: GoalType;
  targetValue: string;
}

export function validateCustomGoal(raw: unknown): GoalFieldError[] {
  const errors: GoalFieldError[] = [];
  if (!raw || typeof raw !== "object") {
    errors.push({ field: "_root", message: "body must be an object" });
    return errors;
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.name !== "string" || r.name.trim().length === 0) {
    errors.push({ field: "name", message: "required" });
  } else if (r.name.length > NAME_MAX) {
    errors.push({ field: "name", message: `max ${NAME_MAX} chars` });
  }

  if (
    typeof r.distanceLabel !== "undefined" &&
    (typeof r.distanceLabel !== "string" || r.distanceLabel.length > DIST_LABEL_MAX)
  ) {
    errors.push({ field: "distanceLabel", message: `max ${DIST_LABEL_MAX} chars` });
  }

  if (!isGoalType(r.type)) {
    errors.push({ field: "type", message: `must be one of ${GOAL_TYPES.join(", ")}` });
  }

  const targetErr = validateTargetValue(r.type, r.targetValue);
  if (targetErr) errors.push({ field: "targetValue", message: targetErr });

  return errors;
}

export interface PatchGoalPayload {
  targetValue?: string;
  name?: string;
  distanceLabel?: string;
  type?: GoalType;
}

export function validatePatchPayload(
  raw: unknown,
  isBuiltin: boolean,
  existingType: GoalType,
): { errors: GoalFieldError[]; payload: PatchGoalPayload } {
  const errors: GoalFieldError[] = [];
  const payload: PatchGoalPayload = {};

  if (!raw || typeof raw !== "object") {
    errors.push({ field: "_root", message: "body must be an object" });
    return { errors, payload };
  }
  const r = raw as Record<string, unknown>;

  let nextType: GoalType = existingType;
  if (typeof r.type !== "undefined") {
    if (isBuiltin) {
      errors.push({ field: "type", message: "cannot change type on a built-in goal" });
    } else if (!isGoalType(r.type)) {
      errors.push({ field: "type", message: `must be one of ${GOAL_TYPES.join(", ")}` });
    } else {
      nextType = r.type;
      payload.type = r.type;
    }
  }

  if (typeof r.name !== "undefined") {
    if (isBuiltin) {
      errors.push({ field: "name", message: "cannot rename a built-in goal" });
    } else if (typeof r.name !== "string" || r.name.trim().length === 0) {
      errors.push({ field: "name", message: "required" });
    } else if (r.name.length > NAME_MAX) {
      errors.push({ field: "name", message: `max ${NAME_MAX} chars` });
    } else {
      payload.name = r.name;
    }
  }

  if (typeof r.distanceLabel !== "undefined") {
    if (isBuiltin) {
      errors.push({ field: "distanceLabel", message: "cannot edit on a built-in goal" });
    } else if (typeof r.distanceLabel !== "string" || r.distanceLabel.length > DIST_LABEL_MAX) {
      errors.push({ field: "distanceLabel", message: `max ${DIST_LABEL_MAX} chars` });
    } else {
      payload.distanceLabel = r.distanceLabel;
    }
  }

  if (typeof r.targetValue !== "undefined") {
    const err = validateTargetValue(nextType, r.targetValue);
    if (err) {
      errors.push({ field: "targetValue", message: err });
    } else {
      payload.targetValue = String(r.targetValue);
    }
  }

  return { errors, payload };
}

function validateTargetValue(type: unknown, raw: unknown): string | null {
  if (typeof raw === "undefined" || raw === null) return "required";
  if (type === "complete") {
    return null;
  }
  if (type === "time") {
    if (typeof raw !== "string" || parseTimeToSeconds(raw) === null) {
      return "use mm:ss or hh:mm:ss";
    }
    if (raw.length > TARGET_VALUE_MAX) return `max ${TARGET_VALUE_MAX} chars`;
    return null;
  }
  if (type === "volume" || type === "count") {
    const num = typeof raw === "string" ? Number(raw) : raw;
    if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) {
      return "must be a positive number";
    }
    return null;
  }
  return "unknown goal type";
}

export class GoalsValidationError extends Error {
  constructor(public readonly fieldErrors: GoalFieldError[]) {
    super("validation_failed");
    this.name = "GoalsValidationError";
  }
}
