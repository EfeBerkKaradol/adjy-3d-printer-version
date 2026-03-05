import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import nodemailer from "nodemailer";

// ==========================================
// POST /api/auth/forgot-password
// Şifre sıfırlama tokeni oluşturur ve e-posta gönderir.
// Güvenlik: Her durumda aynı yanıt döner (e-posta var/yok fark etmez).
// ==========================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 istek/dk per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "anonymous";
    const { success } = await rateLimit(`forgot-password:${ip}`, {
      windowMs: 60_000,
      max: 3,
    });
    if (!success) {
      return NextResponse.json(
        { error: "Cok fazla istek. Lutfen birkaç dakika bekleyin." },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-posta adresi gerekli" },
        { status: 400 }
      );
    }

    // Her durumda aynı yanıt döndür (enumeration koruması)
    const successResponse = NextResponse.json({
      message: "Sifre sifirlama baglantisi gonderildi",
    });

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, fullName: true, email: true, passwordHash: true },
    });

    // Kullanıcı yoksa veya OAuth hesabı (şifresi yok) ise sessizce dön
    if (!user || !user.passwordHash) {
      return successResponse;
    }

    // Token oluştur (64 karakter hex)
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    // Mevcut tokenları sil ve yenisini kaydet
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // E-posta gönder
    if (isEmailConfigured()) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password/${token}`;

      try {
        await transporter.sendMail({
          from:
            process.env.SMTP_FROM || "ADJY 3D <noreply@adjy.com>",
          to: user.email,
          subject: "Sifre Sifirlama - ADJY 3D",
          html: `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#09090b;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:4px;">ADJY</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;color:#09090b;">Sifre Sifirlama</h2>
          <p style="color:#52525b;font-size:14px;line-height:1.6;">
            Merhaba ${user.fullName || ""},<br/>
            Sifrenizi sifirlamak icin asagidaki butona tiklayin. Bu baglanti 1 saat boyunca gecerlidir.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#09090b;color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
              Sifremi Sifirla
            </a>
          </div>
          <p style="color:#a1a1aa;font-size:12px;">
            Bu istegi siz yapmadiysan\u0131z, bu e-postay\u0131 gormezden gelebilirsiniz.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
        console.log("[Email] Sifre sifirlama e-postasi gonderildi:", email);
      } catch (err) {
        console.error("[Email] Sifre sifirlama e-postasi gonderilemedi:", err);
      }
    } else {
      console.log(
        "[Email] SMTP yapılandırılmamış. Reset token:",
        token,
        "User:",
        email
      );
    }

    return successResponse;
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { error: "Bir hata olustu" },
      { status: 500 }
    );
  }
}
