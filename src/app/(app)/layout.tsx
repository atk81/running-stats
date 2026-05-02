import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Chrome } from "@/components/chrome/Chrome";
import { getSessionCookieName } from "@/lib/appwrite/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(getSessionCookieName())?.value;
  if (!session) redirect("/");
  return <Chrome>{children}</Chrome>;
}
