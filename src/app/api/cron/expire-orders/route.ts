import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// GET /api/cron/expire-orders
// Ödemesi tamamlanmamış eski siparişleri iptal eder.
//
// Ödeme ekranında vazgeçilen her deneme "Beklemede" bir
// sipariş bırakıyordu ve bunlar hiç kapanmıyordu: sipariş
// listesi ve raporlar şişiyordu. Vercel Cron günde bir kez
// çağırır (vercel.json). CRON_SECRET ayarlı değilse çalışmaz.
// ==========================================

const MAX_AGE_HOURS = 48;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET ayarlı değil" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);

  const stale = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: { in: ["PENDING", "FAILED"] },
      createdAt: { lt: cutoff },
      payments: { none: { status: "PAID" } },
    },
    select: { id: true },
    take: 500,
  });

  for (const { id } of stale) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: { status: "CANCELLED", guestToken: null },
      }),
      prisma.payment.updateMany({
        where: { orderId: id, status: "PENDING" },
        data: { status: "FAILED", errorMessage: "Ödeme tamamlanmadı (süre doldu)" },
      }),
      prisma.orderHistory.create({
        data: {
          orderId: id,
          status: "CANCELLED",
          changedBy: "system",
          notes: `Ödeme ${MAX_AGE_HOURS} saat içinde tamamlanmadığı için otomatik iptal edildi`,
        },
      }),
    ]);
  }

  return NextResponse.json({ cancelled: stale.length });
}
