import { createHash, randomBytes } from "crypto";

export const INVITE_TTL_DAYS = 7;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function hashInviteCode(rawCode: string): string {
  const normalized = normalizeInviteCode(rawCode);
  return createHash("sha256").update(normalized).digest("hex");
}

export function normalizeInviteCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/\s+/g, "");
}

/** Human-readable code like NS-K7M2PQ */
export function generateInviteCode(): {
  rawCode: string;
  codeHash: string;
  codePrefix: string;
} {
  let body = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    body += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  const rawCode = `NS-${body}`;
  return {
    rawCode,
    codeHash: hashInviteCode(rawCode),
    codePrefix: rawCode.slice(0, 7),
  };
}

export function inviteExpiresAt(from = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITE_TTL_DAYS);
  return expires;
}
