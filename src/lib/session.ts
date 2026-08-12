import { auth } from "@/lib/auth";
import {
  extractBearerToken,
  resolveUserFromApiAccessKey,
} from "@/lib/api-access-keys-server";

export type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

/** Browser session only (NextAuth cookie). */
export async function requireUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

/**
 * Session cookie or `Authorization: Bearer ns_…` API access key.
 * If a Bearer token is present but invalid, returns null (does not fall back).
 */
export async function requireRequestUser(
  request: Request,
): Promise<AuthUser | null> {
  const bearer = extractBearerToken(request);
  if (bearer) {
    return resolveUserFromApiAccessKey(bearer);
  }
  return requireUser();
}
