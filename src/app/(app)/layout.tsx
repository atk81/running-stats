import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Chrome } from "@/components/chrome/Chrome";
import { getSessionClient } from "@/lib/appwrite/server";
import { clearSessionCookie, readSessionSecret } from "@/lib/auth/cookies";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const sessionSecret = readSessionSecret(cookieStore);
  if (!sessionSecret) redirect("/");

  try {
    const { account } = getSessionClient(sessionSecret);
    await account.get();
  } catch {
    clearSessionCookie(cookieStore);
    redirect("/");
  }

  return <Chrome>{children}</Chrome>;
}
