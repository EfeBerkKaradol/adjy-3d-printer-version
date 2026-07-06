import { NextResponse } from "next/server";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { getFromCache, setCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { fetchVisitStats, isAnalyticsConfigured } from "@/lib/vercelAnalytics";

// ==========================================
// ADMIN ANALYTICS ENDPOINT
// Vercel Web Analytics'ten son 30 günün ziyaret
// verilerini çeker. Redis'te 10 dk cache'lenir.
// ==========================================

export async function GET() {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  if (!isAnalyticsConfigured()) {
    return NextResponse.json({ configured: false, visits: null });
  }

  const cached = await getFromCache(CACHE_KEYS.ADMIN_ANALYTICS);
  if (cached) {
    return NextResponse.json(cached);
  }

  const visits = await fetchVisitStats();
  const response = { configured: true, visits };

  // Yalnızca başarılı sonucu cache'le — geçici API hatası 10 dk yapışmasın
  if (visits) {
    await setCache(CACHE_KEYS.ADMIN_ANALYTICS, response, CACHE_TTL.ADMIN_ANALYTICS);
  }

  return NextResponse.json(response);
}
