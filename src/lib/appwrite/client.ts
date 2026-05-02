import { Account, Client, Databases, Storage } from "appwrite";
import { requireEnv } from "@/lib/utils/env";

export const browserClient = new Client()
  .setEndpoint(requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"));

export const browserAccount = new Account(browserClient);
export const browserDatabases = new Databases(browserClient);
export const browserStorage = new Storage(browserClient);
