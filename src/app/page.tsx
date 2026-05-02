import { cookies } from "next/headers";
import { AuthedHome } from "@/components/auth/AuthedHome";
import { ConnectScreen } from "@/components/connect/ConnectScreen";
import { readSessionSecret } from "@/lib/auth/cookies";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = readSessionSecret(cookieStore);
  return session ? <AuthedHome /> : <ConnectScreen />;
}
