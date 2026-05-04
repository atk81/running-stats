import { redirect } from "next/navigation";
import { ConnectScreen } from "@/components/connect/ConnectScreen";
import { ATTRS } from "@/lib/appwrite/collections";
import { getUserDoc } from "@/lib/appwrite/userDoc";
import { getOptionalUserId } from "@/lib/auth/requireUser";

export const runtime = "nodejs";

export default async function HomePage() {
  const userId = await getOptionalUserId();
  if (!userId) return <ConnectScreen />;

  let userDoc;
  try {
    userDoc = await getUserDoc(userId);
  } catch {
    redirect("/onboarding");
  }

  if (!userDoc[ATTRS.users.onboardingComplete]) redirect("/onboarding");
  redirect("/dashboard");
}
