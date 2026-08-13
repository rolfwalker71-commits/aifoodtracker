import { DefaultSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole | string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole | string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isActive?: boolean;
  }
}
