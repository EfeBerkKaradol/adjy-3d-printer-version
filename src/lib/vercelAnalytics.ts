// ==========================================
// VERCEL WEB ANALYTICS API İSTEMCİSİ
//
// Vercel'in Web Analytics API'sinden site ziyaret verilerini çeker.
// https://vercel.com/docs/analytics/web-analytics-api
//
// Gerekli env değişkenleri:
//   VERCEL_API_TOKEN  - Vercel access token (Account Settings → Tokens)
//   VERCEL_PROJECT_ID - Proje ID'si (Project Settings → General)
//   VERCEL_TEAM_ID    - Takım ID'si (kişisel hesapta boş bırakılır)
// ==========================================

const API_BASE = "https://api.vercel.com/v1/query/web-analytics";

export interface DailyVisits {
  date: string; // YYYY-MM-DD
  pageviews: number;
  visitors: number;
}

export interface VisitStats {
  totalPageviews: number; // son 30 gün toplamı
  totalVisitors: number;
  daily: DailyVisits[];
}

/** API için gerekli env değişkenleri tanımlı mı? */
export function isAnalyticsConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function buildUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set("projectId", process.env.VERCEL_PROJECT_ID!);
  if (process.env.VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Son 30 günün günlük ziyaret serisini ve toplamlarını çeker.
 * Env eksikse veya API hata dönerse null döner — dashboard bu
 * durumda analytics bölümünü kurulum ipucuyla gösterir.
 */
export async function fetchVisitStats(): Promise<VisitStats | null> {
  if (!isAnalyticsConfigured()) return null;

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const url = buildUrl("visits/aggregate", {
    since: toDateString(since),
    until: toDateString(now),
    by: "day",
  });

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
      // Route handler kendi Redis cache'ini kullanıyor; burada fetch cache kapalı
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Vercel Analytics API hatası (${res.status}):`, body.slice(0, 300));
      return null;
    }

    const json = (await res.json()) as {
      data?: Array<{ timestamp: string; pageviews: number; visitors: number }>;
    };

    const daily: DailyVisits[] = (json.data ?? []).map((row) => ({
      date: row.timestamp.slice(0, 10),
      pageviews: row.pageviews ?? 0,
      visitors: row.visitors ?? 0,
    }));

    return {
      totalPageviews: daily.reduce((sum, d) => sum + d.pageviews, 0),
      totalVisitors: daily.reduce((sum, d) => sum + d.visitors, 0),
      daily,
    };
  } catch (err) {
    console.error("Vercel Analytics API'ye ulaşılamadı:", err);
    return null;
  }
}
