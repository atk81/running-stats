import type { Models } from "node-appwrite";
import type { GoalType } from "./defaults";

export interface GoalRow extends Models.DefaultRow {
  userId: string;
  goalKey: string;
  name: string;
  type: GoalType;
  distanceLabel?: string;
  targetValue: string;
  targetSeconds?: number;
  currentValue?: string;
  currentSeconds?: number;
  percentage: number;
  done: boolean;
  doneAt?: string;
  year: number;
  isBuiltin: boolean;
}

export interface GoalsResponse {
  year: number;
  goals: GoalRow[];
}
