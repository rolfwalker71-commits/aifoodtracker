import { createHash, randomBytes } from "crypto";

export const API_KEY_PREFIX = "ns_";
export const MAX_API_ACCESS_KEYS = 5;

export function hashApiAccessKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiAccessKey(): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const secret = randomBytes(32).toString("hex");
  const rawKey = `${API_KEY_PREFIX}${secret}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(0, 11),
    keyHash: hashApiAccessKey(rawKey),
  };
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
