import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// POST /api/track — sayfa görüntülemesi
//
// Ziyaret sayıları Vercel panelinde duruyordu; mağazayı yöneten
// kişi hangi ürünün kaç kez açıldığını görmek için başka bir
// yere, başka bir hesaba gitmek zorundaydı.
//
// Toplanan en az şey: yol, dış yönlendiren, sekme ömürlü bir
// oturum anahtarı, cihaz sınıfı ve oturum açıksa kullanıcı.
// IP yazılmaz, çerez kurulmaz, oturumlar birbirine bağlanmaz.
//
// Yönetim sayfaları hiç sayılmaz: kendi gezintimiz rakamları
// şişirmesin.
// ==========================================

const sema = z.object({
  path: z.string().min(1).max(512),
  referrer: z.string().max(512).optional().nullable(),
  sessionId: z.string().min(8).max(64),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
  productId: z.string().max(64).optional().nullable(),
});

/** Sayılmayan yollar */
function sayilmaz(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/login") ||
    path.startsWith("/register")
  );
}

/** Yönlendireni yalnızca alan adına indirger — tam adres saklanmaz */
function kaynak(referrer: string | null | undefined, host: string | null): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    if (host && u.host === host) return null; // site içi gezinme kaynak değildir
    return u.host;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let govde: unknown;
  try {
    govde = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = sema.safeParse(govde);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { path, referrer, sessionId, device, productId } = parsed.data;
  if (sayilmaz(path)) return NextResponse.json({ ok: true, skipped: true });

  // Bir sekme dakikada 40'tan fazla sayfa açmaz; fazlası ya hata
  // döngüsü ya kötü niyet.
  const { success } = await rateLimit(`track:${sessionId}`, { windowMs: 60_000, max: 40 });
  if (!success) return NextResponse.json({ ok: false }, { status: 429 });

  const session = await auth().catch(() => null);

  try {
    await prisma.pageView.create({
      data: {
        // Sorgu dizesi atılır: arama terimleri ve kişisel olabilecek
        // parametreler kaydedilmez.
        path: path.split("?")[0].slice(0, 512),
        referrer: kaynak(referrer, request.headers.get("host")),
        sessionId,
        userId: session?.user?.id ?? null,
        device: device ?? null,
        productId: productId ?? null,
      },
    });
  } catch {
    // Ölçüm, sayfanın çalışmasını engellemez.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
