import { BUILTIN_GOAL_KEYS, type GoalKey } from "./defaults";
import { parseTimeToSeconds } from "@/lib/utils/timeFormat";

export interface GoalFieldError {
  field: GoalKey;
  message: string;
}

export interface GoalInput {
  targetValue: string | number;
}

export type GoalInputMap = Record<GoalKey, GoalInput>;

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

export class GoalsValidationError extends Error {
  constructor(public readonly fieldErrors: GoalFieldError[]) {
    super("validation_failed");
    this.name = "GoalsValidationError";
  }
}
