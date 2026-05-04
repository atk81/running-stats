import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Query } from "node-appwrite";
import {
  OnboardingClient,
  type OnboardingInitialGoal,
} from "@/components/onboarding/OnboardingClient";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient, getSessionClient } from "@/lib/appwrite/server";
import { clearSessionCookie, readSessionSecret } from "@/lib/auth/cookies";
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
  const cookieStore = await cookies();
  const sessionSecret = readSessionSecret(cookieStore);
  if (!sessionSecret) redirect("/");

  let userId: string;
  try {
    const { account } = getSessionClient(sessionSecret);
    const me = await account.get();
    userId = me.$id;
  } catch {
    clearSessionCookie(cookieStore);
    redirect("/");
  }

  const { tablesDB } = getAdminClient();

  const userDoc = await tablesDB.getRow(
    DATABASE_ID,
    COLLECTIONS.users,
    userId,
  );

  if (Boolean(userDoc[ATTRS.users.onboardingComplete])) {
    redirect("/dashboard");
  }

  const accentColor =
    String(userDoc[ATTRS.users.accentColor] ?? "") || DEFAULT_ACCENT_COLOR;
  const initialAvatarFileId = String(
    userDoc[ATTRS.users.avatarFileId] ?? "",
  );

  const goalsList = await tablesDB.listRows(
    DATABASE_ID,
    COLLECTIONS.goals,
    [Query.equal(ATTRS.goals.userId, userId), Query.limit(20)],
  );
  const initialGoals: OnboardingInitialGoal[] = goalsList.rows
    .map((row) => ({
      goalKey: String(row[ATTRS.goals.goalKey] ?? ""),
      targetValue: String(row[ATTRS.goals.targetValue] ?? ""),
    }))
    .filter((g) => isBuiltinGoalKey(g.goalKey))
    .map((g) => ({ goalKey: g.goalKey as GoalKey, targetValue: g.targetValue }));

  return (
    <OnboardingClient
      accentColor={accentColor}
      initialAvatarFileId={initialAvatarFileId}
      initialGoals={initialGoals}
    />
  );
}
