import { cookies } from "next/headers";
import { getSessionCookieName } from "@/lib/appwrite/server";
import { AuthedHome } from "@/components/auth/AuthedHome";
import { ConnectScreen } from "@/components/connect/ConnectScreen";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(getSessionCookieName())?.value;
  return session ? <AuthedHome /> : <ConnectScreen />;
}
