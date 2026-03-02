import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 kayit/dk per IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimit(`register:${ip}`, { windowMs: 60_000, max: 5 });
    if (!success) {
      return NextResponse.json({ error: "Cok fazla istek. Lutfen bekleyin." }, { status: 429 });
    }

    const body = await request.json();

    // 1. Validasyon
    const validatedData = registerSchema.parse(body);

    // [GÖREV 9]: Email'in zaten kayıtlı olup olmadığını kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kayıtlı" },
        { status: 409 }
      );
    }

    // 2. Şifreyi hashle
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // [GÖREV 10]: Yeni kullanıcıyı veritabanına kaydet
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        fullName: validatedData.fullName,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "Kayıt başarılı", user },
      { status: 201 }
    );
  } catch (error) {
    // Zod validation hatası
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Geçersiz veri", details: error },
        { status: 400 }
      );
    }

    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { error: "Kayıt sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
