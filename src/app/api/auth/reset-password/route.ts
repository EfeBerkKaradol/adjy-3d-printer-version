import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ==========================================
// POST /api/auth/reset-password
// Token ile şifre sıfırlama işlemi.
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anonymous";
    const { success } = await rateLimit(`reset-password:${ip}`, {
      windowMs: 60_000,
      max: 5,
    });
    if (!success) {
      return NextResponse.json(
        { error: "Cok fazla istek. Lutfen birkaç dakika bekleyin." },
        { status: 429 }
      );
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token ve yeni sifre gerekli" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Sifre en az 6 karakter olmalidir" },
        { status: 400 }
      );
    }

    // Token'ı hashle ve bul
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Gecersiz veya suresi dolmus sifirlama baglantisi" },
        { status: 400 }
      );
    }

    // Şifreyi güncelle
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return NextResponse.json({
      message: "Sifreniz basariyla guncellendi",
    });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json(
      { error: "Bir hata olustu" },
      { status: 500 }
    );
  }
}
