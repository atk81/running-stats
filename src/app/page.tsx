import { redirect } from "next/navigation";
import { AuthedHome } from "@/components/auth/AuthedHome";
import { ConnectScreen } from "@/components/connect/ConnectScreen";
import { ATTRS } from "@/lib/appwrite/collections";
import { getUserDoc } from "@/lib/appwrite/userDoc";
import { getOptionalUserId } from "@/lib/auth/requireUser";

export const runtime = "nodejs";

export default async function HomePage() {
  const userId = await getOptionalUserId();
  if (!userId) return <ConnectScreen />;

  try {
    const userDoc = await getUserDoc(userId);
    if (!userDoc[ATTRS.users.onboardingComplete]) redirect("/onboarding");
  } catch {
    redirect("/onboarding");
  }

  return <AuthedHome />;
}
