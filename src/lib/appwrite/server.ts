import "server-only";
import { Account, Client, Storage, TablesDB, Users } from "node-appwrite";
import { requireEnv } from "@/lib/utils/env";

interface AdminClient {
  client: Client;
  users: Users;
  tablesDB: TablesDB;
  storage: Storage;
}

interface SessionClient {
  client: Client;
  account: Account;
}

let cachedAdmin: AdminClient | null = null;
let cachedSessionCookieName: string | null = null;

function buildClient(): Client {
  return new Client()
    .setEndpoint(requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
    .setProject(requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"));
}

export function getAdminClient(): AdminClient {
  if (cachedAdmin) return cachedAdmin;
  const client = buildClient().setKey(requireEnv("APPWRITE_API_KEY"));
  cachedAdmin = {
    client,
    users: new Users(client),
    tablesDB: new TablesDB(client),
    storage: new Storage(client),
  };
  return cachedAdmin;
}

export function getSessionClient(sessionSecret: string): SessionClient {
  const client = buildClient().setSession(sessionSecret);
  return {
    client,
    account: new Account(client),
  };
}

export function getSessionCookieName(): string {
  if (cachedSessionCookieName) return cachedSessionCookieName;
  cachedSessionCookieName = `a_session_${requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID")}`;
  return cachedSessionCookieName;
}
