import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import argon2 from "argon2";
import { prisma } from "@/lib/db";

// NOTE: Auth.js does not support database session strategy when a
// Credentials provider is present (there is no OAuth redirect to attach a
// session to). We use JWT sessions and store clinicId/userId in the token.
// The Prisma adapter is still wired up so email/OAuth providers can be added
// later in Phase 1 without a migration.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active || !user.passwordHash) return null;

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, clinicId: user.clinicId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.clinicId = (user as { clinicId?: string }).clinicId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
        (session.user as { clinicId?: string }).clinicId = token.clinicId as string;
      }
      return session;
    },
  },
});
