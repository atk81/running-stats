import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { handleSync, SyncError } from "@/lib/strava/sync";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const result = await handleSync(auth.userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SyncError) {
      const body: Record<string, unknown> = {
        error: err.code,
        message: err.message,
      };
      if (typeof err.retryAfter === "number") body.retryAfter = err.retryAfter;
      return NextResponse.json(body, { status: err.status });
    }
    console.error("[strava-sync] unexpected error", err);
    return NextResponse.json(
      { error: "sync_failed", message: "Unexpected error" },
      { status: 500 },
    );
  }
}
