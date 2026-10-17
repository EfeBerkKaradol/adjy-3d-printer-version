import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

export const dynamic = "force-dynamic";

// ==========================================
// GET /api/admin/analytics
//
// Ziyaret sayıları Vercel'in API'sinden çekiliyordu: iki ayrı
// ortam değişkeni isteniyor, yoksa dashboard "yapılandırılmamış"
// diyordu — ve kimse o anahtarları koymadığı için hiç veri
// görünmüyordu.
//
// Artık kendi ölçümümüzden okuyor. Kurulum gerekmez, veri
// siteyle aynı yerde, ve "şu an sitede" gibi Vercel'in
// vermediği bir şey de verilebiliyor.
// ==========================================

/** Son bu kadar dakikada hareketi olan oturum "şu an sitede" sayılır */
const CANLI_DAKIKA = 5;

const GUN = 30;

export async function GET() {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const simdi = new Date();
  const otuzGun = new Date(simdi.getTime() - GUN * 86_400_000);
  const bugun = new Date(simdi);
  bugun.setHours(0, 0, 0, 0);
  const canliEsik = new Date(simdi.getTime() - CANLI_DAKIKA * 60_000);

  try {
    const [gunluk, toplam, oturumlar, bugunGoruntuleme, bugunOturum, canli] =
      await Promise.all([
        prisma.$queryRaw<{ gun: Date; goruntuleme: bigint; oturum: bigint }[]>`
          SELECT date_trunc('day', "createdAt") AS gun,
                 COUNT(*)::bigint AS goruntuleme,
                 COUNT(DISTINCT "sessionId")::bigint AS oturum
          FROM "page_views"
          WHERE "createdAt" >= ${otuzGun}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        prisma.pageView.count({ where: { createdAt: { gte: otuzGun } } }),
        prisma.pageView.findMany({
          where: { createdAt: { gte: otuzGun } },
          select: { sessionId: true },
          distinct: ["sessionId"],
        }),
        prisma.pageView.count({ where: { createdAt: { gte: bugun } } }),
        prisma.pageView.findMany({
          where: { createdAt: { gte: bugun } },
          select: { sessionId: true },
          distinct: ["sessionId"],
        }),
        prisma.pageView.findMany({
          where: { createdAt: { gte: canliEsik } },
          select: { sessionId: true },
          distinct: ["sessionId"],
        }),
      ]);

    // Veri olmayan günler grafikte boşluk bırakmasın
    const haritaGoruntuleme = new Map(
      gunluk.map((g) => [
        g.gun.toISOString().slice(0, 10),
        { pageviews: Number(g.goruntuleme), visitors: Number(g.oturum) },
      ])
    );
    const daily: { date: string; pageviews: number; visitors: number }[] = [];
    for (let i = GUN - 1; i >= 0; i--) {
      const d = new Date(simdi.getTime() - i * 86_400_000);
      const anahtar = d.toISOString().slice(0, 10);
      const v = haritaGoruntuleme.get(anahtar);
      daily.push({ date: anahtar, pageviews: v?.pageviews ?? 0, visitors: v?.visitors ?? 0 });
    }

    return NextResponse.json({
      configured: true,
      visits: {
        totalPageviews: toplam,
        totalVisitors: oturumlar.length,
        todayPageviews: bugunGoruntuleme,
        todayVisitors: bugunOturum.length,
        live: canli.length,
        liveWindowMinutes: CANLI_DAKIKA,
        daily,
      },
    });
  } catch {
    // Ölçüm okunamazsa dashboard'un geri kalanı çalışmaya devam eder
    return NextResponse.json({ configured: false, visits: null });
  }
}
