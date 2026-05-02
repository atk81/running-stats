"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("sign out: logout request failed", err);
    }
    queryClient.clear();
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={className}
      style={{
        background: "transparent",
        border: 0,
        cursor: pending ? "wait" : "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--fg-3)",
        padding: 0,
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
