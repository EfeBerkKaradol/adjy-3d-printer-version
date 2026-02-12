import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

// ==========================================
// POST /api/auth/register
// Yeni kullanıcı kayıt endpoint'i.
//
// Body: { email, password, confirmPassword, fullName }
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validasyon
    const validatedData = registerSchema.parse(body);

    // [GÖREV 9]: Email'in zaten kayıtlı olup olmadığını kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kayitli" },
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
      { message: "Kayit basarili", user },
      { status: 201 }
    );
  } catch (error) {
    // Zod validation hatası
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Gecersiz veri", details: error },
        { status: 400 }
      );
    }

    console.error("POST /api/auth/register error:", error);
    return NextResponse.json(
      { error: "Kayit sirasinda bir hata olustu" },
      { status: 500 }
    );
  }
}
