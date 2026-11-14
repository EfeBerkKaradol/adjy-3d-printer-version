import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/validations/contact";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { COMPANY } from "@/lib/company";
import { getAbsoluteUrl } from "@/lib/url";

// İletişim formu mesajlarının bildirileceği adres
const CONTACT_NOTIFY_EMAIL =
  process.env.CONTACT_NOTIFY_EMAIL || COMPANY.supportEmail || COMPANY.email;

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

export async function POST(req: NextRequest) {
  try {
    // Spam koruması: IP başına 10 dakikada 5 mesaj
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await rateLimit(`contact:${ip}`, { windowMs: 10 * 60_000, max: 5 });
    if (!success) {
      return NextResponse.json(
        { error: "Çok fazla mesaj gönderildi. Lütfen biraz sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Zod validasyonu
    const validatedData = contactSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Geçersiz form verileri", details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, subject, message, website } = validatedData.data;

    // Bot tuzağı doluysa kaydetmeden "başarılı" dön — bot fark etmesin
    if (website) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

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

    // Size e-posta ile haber ver (eskiden mesaj yalnızca panelde
    // duruyordu, bakılmazsa günlerce fark edilmiyordu)
    // Vercel'de yanıt döndükten sonra iş kesilebildiği için beklenir;
    // e-posta hatası mesajın kaydını bozmaz (sendEmail hata fırlatmaz).
    if (CONTACT_NOTIFY_EMAIL) {
      await sendEmail({
        to: CONTACT_NOTIFY_EMAIL,
        subject: `İletişim formu — ${subject.slice(0, 80)}`,
        html: `
          <h2>Siteden yeni mesaj</h2>
          <p><b>${escapeHtml(name)}</b> — <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
          <p><b>Konu:</b> ${escapeHtml(subject)}</p>
          <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
          <p><a href="${getAbsoluteUrl()}/admin/messages">Panelde aç</a></p>
        `,
      });
    }

    return NextResponse.json({ success: true, messageId: newMsg.id }, { status: 201 });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { error: "İletişim mesajı gönderilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
