import { NextRequest, NextResponse } from "next/server";
import { checkBin } from "@/lib/iyzico";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/paymentOrder";

// ==========================================
// POST /api/payments/bin
// Kartın ilk 6-8 hanesinden (BIN) banka ve program bilgisi.
// Piksel kartta "WORLD", "BONUS", "TROY" gibi rozetler buradan
// gelir. BIN tek başına kartı tanımlamaz (her bankanın binlerce
// müşterisi aynı BIN'i paylaşır); yine de loglanmaz.
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const { bin } = await request.json();
    const binNumber = String(bin ?? "").replace(/\D/g, "").slice(0, 8);
    if (binNumber.length < 6) {
      return NextResponse.json({ error: "En az 6 hane gerekli" }, { status: 400 });
    }

    const { success } = await rateLimit(`bin:${clientIp(request)}`, {
      windowMs: 60_000,
      max: 30,
    });
    if (!success) {
      return NextResponse.json({ error: "Cok fazla istek" }, { status: 429 });
    }

    const result = await checkBin(binNumber);
    if (result.status !== "success") {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json(
      {
        found: true,
        association: result.cardAssociation ?? null,
        family: result.cardFamily ?? null,
        bankName: result.bankName ?? null,
        cardType: result.cardType ?? null,
        commercial: result.commercial === 1,
      },
      { headers: { "Cache-Control": "private, max-age=3600" } }
    );
  } catch {
    return NextResponse.json({ found: false });
  }
}
