import {
  API_KEY_PREFIX,
  extractBearerToken,
  hashApiAccessKey,
} from "@/lib/api-access-keys";
import { prisma } from "@/lib/prisma";

export async function resolveUserFromApiAccessKey(rawKey: string) {
  const trimmed = rawKey.trim();
  if (!trimmed.startsWith(API_KEY_PREFIX) || trimmed.length < 20) {
    return null;
  }

  const keyHash = hashApiAccessKey(trimmed);
  const record = await prisma.apiAccessKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (!record || !record.user.isActive) return null;

  void prisma.apiAccessKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    id: record.user.id,
    email: record.user.email,
    name: record.user.name ?? record.user.email.split("@")[0],
  };
}

export { extractBearerToken };
