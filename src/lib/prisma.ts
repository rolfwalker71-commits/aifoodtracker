import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ??
  new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const client = (globalForPrisma.prisma ??= createPrismaClient());
      const value = Reflect.get(client, prop, receiver);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });

if (process.env.NODE_ENV !== "production") {
  // Keep the same singleton behavior in development after first use.
  void globalForPrisma;
}
