import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";

// Google OAuth sadece env değerleri ayarlandığında aktif.
// Giriş ve kayıt sayfaları da buna bakar: anahtarlar yoksa
// "Google ile giriş" düğmesi hiç gösterilmez (eskiden düğme
// her zaman görünüyor, tıklanınca hata sayfasına düşüyordu).
export const isGoogleAuthEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const providers = [];

if (isGoogleAuthEnabled) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      // Oturum JWT ile tutuluyor, Google'ın yenileme anahtarına
      // ihtiyaç yok. Eskiden "consent + offline" isteniyordu:
      // müşteri her girişte izin ekranını yeniden görüyordu.
      // select_account yalnızca hesap seçtirir.
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    })
  );
}

providers.push(
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user || !user.passwordHash) {
        return null;
      }

      const isValid = await bcrypt.compare(
        credentials.password as string,
        user.passwordHash
      );
      if (!isValid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        image: user.image,
      };
    },
  })
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: (() => {
    const adapter = PrismaAdapter(prisma);
    return {
      ...adapter,
      createUser: async (data: any) => {
        const user = await prisma.user.create({
          data: {
            email: data.email,
            emailVerified: data.emailVerified,
            fullName: data.name,
            image: data.image,
          },
        });
        return {
          ...user,
          name: user.fullName,
        } as any;
      },
      updateUser: async (data: any) => {
        const { name, ...rest } = data;
        if (name !== undefined) {
          rest.fullName = name;
        }
        const user = await prisma.user.update({
          where: { id: rest.id },
          data: rest,
        });
        return {
          ...user,
          name: user.fullName,
        } as any;
      },
      getUser: async (id: string) => {
        const user = await adapter.getUser!(id);
        if (!user) return null;
        return { ...user, name: (user as any).fullName } as any;
      },
      getUserByEmail: async (email: string) => {
        const user = await adapter.getUserByEmail!(email);
        if (!user) return null;
        return { ...user, name: (user as any).fullName } as any;
      },
      // Google yanıtında şemada olmayan alanlar gelebiliyor
      // (ör. uygulama "Test" modundayken refresh_token_expires_in).
      // Prisma bilinmeyen alanı reddedince ilk Google girişi
      // hata veriyordu; yalnızca tablodaki alanlar yazılır.
      linkAccount: async (account: any) => {
        await prisma.account.create({
          data: {
            userId: account.userId,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token ?? null,
            access_token: account.access_token ?? null,
            expires_at: account.expires_at ?? null,
            token_type: account.token_type ?? null,
            scope: account.scope ?? null,
            id_token: account.id_token ?? null,
            session_state:
              typeof account.session_state === "string" ? account.session_state : null,
          },
        });
      },
      getUserByAccount: async (provider_providerAccountId: { providerAccountId: string, provider: string }) => {
        const user = await adapter.getUserByAccount!(provider_providerAccountId);
        if (!user) return null;
        return { ...user, name: (user as any).fullName } as any;
      },
    } as any;
  })(),
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60,
  },
  jwt: {
    maxAge: 2 * 60 * 60,
  },
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Kullanıcının rolünü DB'den çek (ilk login'de)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
  },
});
