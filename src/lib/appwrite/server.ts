import "server-only";
import { Account, Client, Databases, Users } from "node-appwrite";
import { requireEnv } from "@/lib/utils/env";

interface AdminClient {
  client: Client;
  users: Users;
  databases: Databases;
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
    databases: new Databases(client),
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

export function getProjectId(): string {
  return requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
}

export function getSessionCookieName(): string {
  if (cachedSessionCookieName) return cachedSessionCookieName;
  cachedSessionCookieName = `a_session_${getProjectId()}`;
  return cachedSessionCookieName;
}
