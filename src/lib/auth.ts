import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureAdminBootstrap, isAdminRole } from "@/lib/roles";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        await ensureAdminBootstrap();

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role ?? "USER";
      } else if (trigger === "update" && token.sub) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, isActive: true, name: true, email: true },
        });
        if (!fresh || !fresh.isActive) {
          token.role = "USER";
          token.isActive = false;
        } else {
          token.role = fresh.role;
          token.isActive = true;
          token.name = fresh.name;
          token.email = fresh.email;
        }
      } else if (token.sub && !token.role) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, isActive: true },
        });
        token.role = fresh?.role ?? "USER";
        token.isActive = fresh?.isActive ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = (token.role as string) || "USER";
        session.user.isAdmin = isAdminRole(token.role as string);
      }
      return session;
    },
  },
});
