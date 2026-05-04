export type GoalKey = "k5" | "k10" | "hm" | "volume";
export type GoalType = "time" | "volume";

export interface GoalMeta {
  key: GoalKey;
  name: string;
  type: GoalType;
  distanceLabel: string;
  defaultTarget: string;
}

export const BUILTIN_GOAL_META: Record<GoalKey, GoalMeta> = {
  k5: {
    key: "k5",
    name: "5K time",
    type: "time",
    distanceLabel: "5 km",
    defaultTarget: "22:00",
  },
  k10: {
    key: "k10",
    name: "10K time",
    type: "time",
    distanceLabel: "10 km",
    defaultTarget: "47:00",
  },
  hm: {
    key: "hm",
    name: "Half marathon",
    type: "time",
    distanceLabel: "21.1 km",
    defaultTarget: "1:47:00",
  },
  volume: {
    key: "volume",
    name: "Yearly volume",
    type: "volume",
    distanceLabel: "—",
    defaultTarget: "1000",
  },
};

export const BUILTIN_GOAL_KEYS: GoalKey[] = ["k5", "k10", "hm", "volume"];

export function buildGoalRowId(userId: string, key: GoalKey): string {
  return `g_${userId}_${key}`;
}
