import type { NextAuthConfig } from "next-auth";

// Edge Runtime uyumlu base config — middleware'de kullanılır.
// Prisma, bcrypt gibi Node.js-only bağımlılıklar burada YOKTUR.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
    newUser: "/register",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        if (!isLoggedIn) return false; // → /login?callbackUrl=...
        if (auth.user.role !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return true;
    },
    jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }: { session: any; token: any }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || "USER";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
