import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/validations/contact";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Zod validasyonu
    const validatedData = contactSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Geçersiz form verileri", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = validatedData.data;

    // Veritabanına kaydet
    // @ts-ignore - Prisma client hasn't caught up in TS server yet
    const newMsg = await (prisma as any).contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    return NextResponse.json({ success: true, messageId: newMsg.id }, { status: 201 });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "İletişim mesajı gönderilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
