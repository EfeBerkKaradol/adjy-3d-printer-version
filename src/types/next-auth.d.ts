import { DefaultSession } from "next-auth";

// NextAuth session tipini genişlet — user.id ve user.role erişimi için
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
