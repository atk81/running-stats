"use client";

import { useContext } from "react";
import { UserContext, type UserContextValue } from "@/lib/contexts/UserProvider";

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within <UserProvider>");
  }
  return ctx;
}
