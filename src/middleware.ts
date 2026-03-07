import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// NextAuth v5 authorized callback pattern — Edge Runtime uyumlu.
// getToken() yerine auth() kullanarak JWT doğrulaması yapar.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*"],
};
