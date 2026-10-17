import Link from "next/link";
import { prisma } from "@/lib/db";
import { ArrowRight, Globe, MonitorSmartphone, Users } from "lucide-react";

export const dynamic = "force-dynamic";

// ==========================================
// ZİYARETLER
//
// Ziyaret sayıları Vercel panelinde duruyordu: mağazayı yöneten
// kişi hangi ürünün kaç kez açıldığını görmek için başka bir
// hesaba gitmek zorundaydı. Artık siparişlerin yanında.
//
// Ölçüm çerezsiz: oturum anahtarı sekme ömürlüdür, IP
// saklanmaz. "Oturum" burada bir sekme demek, bir kişi değil —
// sayılar buna göre okunmalı.
// ==========================================

const ARALIKLAR = [
  { gun: 1, label: "Bugün" },
  { gun: 7, label: "7 gün" },
  { gun: 30, label: "30 gün" },
  { gun: 90, label: "90 gün" },
] as const;

function baslangic(gun: number): Date {
  const d = new Date();
  if (gun === 1) {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  d.setDate(d.getDate() - gun);
  return d;
}

function yuzde(deger: number, toplam: number): number {
  return toplam > 0 ? Math.round((deger / toplam) * 100) : 0;
}

export default async function ZiyaretlerPage({
  searchParams,
}: {
  searchParams: Promise<{ gun?: string }>;
}) {
  const { gun: gunParam } = await searchParams;
  const gun = ARALIKLAR.some((a) => String(a.gun) === gunParam)
    ? Number(gunParam)
    : 7;
  const since = baslangic(gun);
  const where = { createdAt: { gte: since } };

  const [toplam, oturumlar, uyeGoruntuleme, sayfalar, kaynaklar, cihazlar, gunluk, sonlar] =
    await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.findMany({ where, select: { sessionId: true }, distinct: ["sessionId"] }),
      prisma.pageView.count({ where: { ...where, userId: { not: null } } }),
      prisma.pageView.groupBy({
        by: ["path"],
        where,
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 12,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { ...where, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 8,
      }),
      prisma.pageView.groupBy({
        by: ["device"],
        where,
        _count: { device: true },
        orderBy: { _count: { device: "desc" } },
      }),
      prisma.$queryRaw<{ gun: Date; adet: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS gun, COUNT(*)::bigint AS adet
        FROM "page_views"
        WHERE "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.pageView.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, path: true, referrer: true, device: true, createdAt: true, userId: true },
      }),
    ]);

  const oturumSayisi = oturumlar.length;
  const enYuksekGun = Math.max(1, ...gunluk.map((g) => Number(g.adet)));

  // Ürün sayfalarının adları — yol yerine ürün adı okunur
  const urunSluglari = sayfalar
    .map((s) => s.path.match(/^\/products\/([^/]+)$/)?.[1])
    .filter((s): s is string => !!s);
  const urunler = urunSluglari.length
    ? await prisma.product.findMany({
        where: { slug: { in: urunSluglari } },
        select: { slug: true, name: true },
      })
    : [];
  const urunAdi = new Map(urunler.map((u) => [u.slug, u.name]));

  const kartlar = [
    { label: "Sayfa görüntüleme", deger: toplam.toLocaleString("tr-TR"), icon: Globe },
    { label: "Oturum (sekme)", deger: oturumSayisi.toLocaleString("tr-TR"), icon: Users },
    {
      label: "Oturum başına sayfa",
      deger: oturumSayisi > 0 ? (toplam / oturumSayisi).toFixed(1) : "—",
      icon: MonitorSmartphone,
    },
    {
      label: "Üye görüntülemesi",
      deger: `%${yuzde(uyeGoruntuleme, toplam)}`,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ziyaretler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Çerezsiz ölçüm: oturum anahtarı sekme kapanınca silinir, IP
            saklanmaz. &quot;Oturum&quot; bir sekme demektir, bir kişi değil.
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-border/60 p-1">
          {ARALIKLAR.map((a) => (
            <Link
              key={a.gun}
              href={`/admin/ziyaretler?gun=${a.gun}`}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                a.gun === gun ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              {a.label}
            </Link>
          ))}
        </nav>
      </div>

      {toplam === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 px-6 py-16 text-center">
          <p className="font-medium">Bu aralıkta kayıt yok</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ölçüm yeni açıldıysa ilk ziyaretlerin görünmesi birkaç dakika sürer.
            Yönetim sayfaları hiç sayılmaz.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kartlar.map((k) => (
              <div key={k.label} className="rounded-xl border border-border/40 bg-card p-5">
                <k.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                <p className="mt-4 text-xs text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{k.deger}</p>
              </div>
            ))}
          </div>

          {gunluk.length > 1 && (
            <section className="rounded-xl border border-border/40 bg-card p-5">
              <h2 className="text-sm font-medium">Günlük görüntüleme</h2>
              <div className="mt-5 flex h-36 items-end gap-1.5">
                {gunluk.map((g) => {
                  const adet = Number(g.adet);
                  return (
                    <div key={g.gun.toISOString()} className="group flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t bg-foreground/80 transition-colors group-hover:bg-foreground"
                        style={{ height: `${Math.max(4, (adet / enYuksekGun) * 100)}%` }}
                        title={`${g.gun.toLocaleDateString("tr-TR")}: ${adet}`}
                      />
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {g.gun.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-border/40 bg-card">
              <h2 className="border-b border-border/40 px-5 py-4 text-sm font-medium">
                En çok açılan sayfalar
              </h2>
              <ul className="divide-y divide-border/40">
                {sayfalar.map((s) => {
                  const slug = s.path.match(/^\/products\/([^/]+)$/)?.[1];
                  const ad = slug ? urunAdi.get(slug) : null;
                  return (
                    <li key={s.path} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{ad ?? s.path}</p>
                        {ad && (
                          <p className="truncate text-xs text-muted-foreground">{s.path}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {s._count.path}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="space-y-6">
              <section className="rounded-xl border border-border/40 bg-card">
                <h2 className="border-b border-border/40 px-5 py-4 text-sm font-medium">
                  Nereden geldiler
                </h2>
                {kaynaklar.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">
                    Bu aralıkta dış yönlendirme yok — gelenler adresi doğrudan
                    yazmış ya da yer imlerinden gelmiş.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {kaynaklar.map((k) => (
                      <li
                        key={k.referrer}
                        className="flex items-center justify-between gap-4 px-5 py-3"
                      >
                        <span className="truncate text-sm">{k.referrer}</span>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {k._count.referrer}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-border/40 bg-card">
                <h2 className="border-b border-border/40 px-5 py-4 text-sm font-medium">
                  Cihaz
                </h2>
                <ul className="divide-y divide-border/40">
                  {cihazlar.map((c) => (
                    <li
                      key={c.device ?? "bilinmiyor"}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <span className="text-sm capitalize">{c.device ?? "bilinmiyor"}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {c._count.device} · %{yuzde(c._count.device, toplam)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <section className="rounded-xl border border-border/40 bg-card">
            <h2 className="border-b border-border/40 px-5 py-4 text-sm font-medium">
              Son hareketler
            </h2>
            <ul className="divide-y divide-border/40">
              {sonlar.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{s.path}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.referrer ?? "doğrudan"} · {s.device ?? "?"}
                      {s.userId && " · üye"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {s.createdAt.toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Link
            href="/admin/musteriler"
            className="group inline-flex items-center gap-2 text-sm font-medium"
          >
            Müşterilere geç
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </>
      )}
    </div>
  );
}
