import "server-only";
import { cache } from "react";
import { COLLECTIONS, DATABASE_ID } from "@/lib/appwrite/collections";
import { getAdminClient } from "@/lib/appwrite/server";
import type { Models } from "node-appwrite";

export const getUserDoc = cache(
  async (userId: string): Promise<Models.DefaultRow> => {
    const { tablesDB } = getAdminClient();
    return tablesDB.getRow(DATABASE_ID, COLLECTIONS.users, userId);
  },
);
