import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validations/contact";
import { rateLimit } from "@/lib/rate-limit";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimit(`contact:${ip}`, { windowMs: 60_000, max: 3 });
    if (!success) {
      return NextResponse.json({ error: "Cok fazla istek. Lutfen bekleyin." }, { status: 429 });
    }

    const body = await request.json();
    const data = contactSchema.parse(body);

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (from) {
      await transporter.sendMail({
        from,
        to: from,
        replyTo: data.email,
        subject: `[ADJY Iletisim] ${data.subject}`,
        html: `
          <h2>Yeni Iletisim Mesaji</h2>
          <p><strong>Ad:</strong> ${data.name}</p>
          <p><strong>E-posta:</strong> ${data.email}</p>
          <p><strong>Konu:</strong> ${data.subject}</p>
          <hr/>
          <p>${data.message.replace(/\n/g, "<br/>")}</p>
        `,
      });
    }

    return NextResponse.json({ message: "Mesajiniz gonderildi" });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Gecersiz veri" }, { status: 400 });
    }
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Mesaj gonderilemedi" }, { status: 500 });
  }
}
