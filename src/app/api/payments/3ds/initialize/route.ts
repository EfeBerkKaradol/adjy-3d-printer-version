import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { initializeThreeDS } from "@/lib/iyzico";
import { clientIp, prepareOrderPayment } from "@/lib/paymentOrder";
import { rateLimit } from "@/lib/rate-limit";
import { digitsOnly, parseExpiry, validateCard } from "@/lib/card";
import { getAbsoluteUrl } from "@/lib/url";

// ==========================================
// POST /api/payments/3ds/initialize
// Sitenin kendi piksel kart formundan gelen kartla iyzico 3D
// Secure ödemesini başlatır; yanıt bankanın doğrulama sayfasıdır.
//
// KART VERİSİ KURALI: istek gövdesi hiçbir koşulda loglanmaz,
// veritabanına yazılmaz ve yanıta geri konmaz. Hata günlüklerine
// yalnızca sipariş numarası ile iyzico hata kodu düşer.
// ==========================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: {
    orderId?: unknown;
    guestToken?: unknown;
    card?: { holder?: unknown; number?: unknown; expiry?: unknown; cvc?: unknown };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  // ==========================================
  // KART DENEME (carding) KORUMASI
  // Çalıntı kart listesini bu uçta denemek isteyen biri her
  // seferinde yeni misafir sipariş açarak sipariş başına sınırı
  // aşabilir; bu yüzden IP başına da sınır var.
  // ==========================================
  const ip = clientIp(request);
  const perMinute = await rateLimit(`payment3ds:ip:${ip}`, { windowMs: 60_000, max: 5 });
  const perHour = await rateLimit(`payment3ds:ip-hour:${ip}`, { windowMs: 3_600_000, max: 20 });
  if (!perMinute.success || !perHour.success) {
    return NextResponse.json(
      { error: "Çok fazla ödeme denemesi. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const card = {
    holder: String(body.card?.holder ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
    number: digitsOnly(String(body.card?.number ?? "")).slice(0, 19),
    expiry: digitsOnly(String(body.card?.expiry ?? "")).slice(0, 4),
    cvc: digitsOnly(String(body.card?.cvc ?? "")).slice(0, 4),
  };
  // Gövdedeki kart nesnesine artık ihtiyaç yok
  delete body.card;

  const errors = validateCard(card);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Kart bilgilerini kontrol edin", fields: errors },
      { status: 400 }
    );
  }

  try {
    const prepared = await prepareOrderPayment(
      request,
      body.orderId,
      body.guestToken,
      "payment3ds"
    );
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: prepared.status });
    }

    const expiry = parseExpiry(card.expiry)!;
    const result = await initializeThreeDS(
      {
        ...prepared.params,
        callbackUrl: `${getAbsoluteUrl()}/api/payments/3ds/callback`,
      },
      {
        cardHolderName: card.holder,
        cardNumber: card.number,
        expireMonth: expiry.month,
        expireYear: expiry.year,
        cvc: card.cvc,
      }
    );

    if (result.status !== "success" || !result.threeDSHtmlContent) {
      console.error(
        `iyzico 3DS initialize başarısız — sipariş ${prepared.orderNumber}, kod ${
          result.errorCode ?? "?"
        }`
      );
      return NextResponse.json(
        {
          error: "Ödeme başlatılamadı",
          code: result.errorCode ?? null,
          details: result.errorMessage ?? null,
        },
        { status: 502 }
      );
    }

    await prisma.payment.create({
      data: {
        orderId: prepared.orderId,
        iyzicoConversationId: prepared.conversationId,
        iyzicoPaymentId: result.paymentId ? String(result.paymentId) : null,
        amount: Number(prepared.amount),
        currency: "TRY",
        status: "PENDING",
      },
    });

    return NextResponse.json({ threeDSHtmlContent: result.threeDSHtmlContent });
  } catch (error) {
    // Hata nesnesinin kendisi değil yalnızca mesajı: kart verisi
    // içeren bir nesne yanlışlıkla günlüğe düşmesin
    console.error(
      "POST /api/payments/3ds/initialize error:",
      error instanceof Error ? error.message : "bilinmeyen hata"
    );
    return NextResponse.json(
      { error: "Ödeme başlatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
