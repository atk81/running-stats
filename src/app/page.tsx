import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthedHome } from "@/components/auth/AuthedHome";
import { ConnectScreen } from "@/components/connect/ConnectScreen";
import { ATTRS, COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient, getSessionClient } from "@/lib/appwrite/server";
import { clearSessionCookie, readSessionSecret } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionSecret = readSessionSecret(cookieStore);
  if (!sessionSecret) return <ConnectScreen />;

  let userId: string;
  try {
    const { account } = getSessionClient(sessionSecret);
    const me = await account.get();
    userId = me.$id;
  } catch {
    clearSessionCookie(cookieStore);
    return <ConnectScreen />;
  }

  try {
    const { tablesDB } = getAdminClient();
    const userDoc = await tablesDB.getRow(
      DATABASE_ID,
      COLLECTIONS.users,
      userId,
    );
    if (!Boolean(userDoc[ATTRS.users.onboardingComplete])) {
      redirect("/onboarding");
    }
  } catch {
    redirect("/onboarding");
  }

  return <AuthedHome />;
}
