import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validations/password";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 401 });
    }

    const { success } = await rateLimit(`password:${session.user.id}`, { windowMs: 60_000, max: 5 });
    if (!success) {
      return NextResponse.json({ error: "Cok fazla deneme. Lutfen bekleyin." }, { status: 429 });
    }

    const body = await request.json();
    const data = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Bu hesap OAuth ile olusturulmus. Sifre degistirilemez." },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Mevcut sifre yanlis" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ message: "Sifre basariyla guncellendi" });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Gecersiz veri" }, { status: 400 });
    }
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Sifre degistirilemedi" }, { status: 500 });
  }
}
