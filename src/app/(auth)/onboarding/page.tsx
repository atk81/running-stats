import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import {
  OnboardingClient,
  type OnboardingInitialGoal,
} from "@/components/onboarding/OnboardingClient";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import { getUserDoc } from "@/lib/appwrite/userDoc";
import { requireUserPage } from "@/lib/auth/requireUser";
import { DEFAULT_ACCENT_COLOR } from "@/lib/constants";
import {
  BUILTIN_GOAL_KEYS,
  type GoalKey,
} from "@/lib/goals/defaults";

export const runtime = "nodejs";

const BUILTIN_KEY_SET = new Set<GoalKey>(BUILTIN_GOAL_KEYS);

function isBuiltinGoalKey(value: string): value is GoalKey {
  return BUILTIN_KEY_SET.has(value as GoalKey);
}

export default async function OnboardingPage() {
  const userId = await requireUserPage("/");

  const { tablesDB } = getAdminClient();
  const [userDoc, goalsList] = await Promise.all([
    getUserDoc(userId),
    tablesDB.listRows(DATABASE_ID, COLLECTIONS.goals, [
      Query.equal(ATTRS.goals.userId, userId),
      Query.equal(ATTRS.goals.goalKey, BUILTIN_GOAL_KEYS),
      Query.limit(BUILTIN_GOAL_KEYS.length),
    ]),
  ]);

  if (userDoc[ATTRS.users.onboardingComplete]) redirect("/dashboard");

  const accentColor =
    String(userDoc[ATTRS.users.accentColor] ?? "") || DEFAULT_ACCENT_COLOR;
  const initialAvatarFileId = String(
    userDoc[ATTRS.users.avatarFileId] ?? "",
  );

  const initialGoals: OnboardingInitialGoal[] = [];
  for (const row of goalsList.rows) {
    const goalKey = String(row[ATTRS.goals.goalKey] ?? "");
    if (!isBuiltinGoalKey(goalKey)) continue;
    initialGoals.push({
      goalKey,
      targetValue: String(row[ATTRS.goals.targetValue] ?? ""),
    });
  }

  return (
    <OnboardingClient
      accentColor={accentColor}
      initialAvatarFileId={initialAvatarFileId}
      initialGoals={initialGoals}
    />
  );
}
