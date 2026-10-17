import Link from "next/link";
import { prisma } from "@/lib/db";
import { SEGMENTLER, segmentBelirle, uykudaMi, type SegmentId } from "@/lib/crm";
import { formatTRY } from "@/lib/slicer";
import { ArrowRight, Search } from "lucide-react";

export const dynamic = "force-dynamic";

// ==========================================
// MÜŞTERİLER (CRM)
//
// Kullanıcılar sayfası bir hesap listesiydi: ad, rol, sipariş
// adedi. Kimin kaç para bıraktığı, en son ne zaman uğradığı,
// kiminle ne konuşulduğu hiçbir yerde durmuyordu.
//
// Burası müşteriye göre kurulmuş: harcama, son sipariş,
// segment ve elle verilen etiketler bir arada. Satır tıklanınca
// o kişinin bütün geçmişi açılır.
//
// Misafir siparişleri de görünür — misafir için de bir kullanıcı
// satırı açılıyor, yalnızca parolası yok.
// ==========================================

const SIRALAMALAR = {
  harcama: "Harcamaya göre",
  son: "Son siparişe göre",
  yeni: "Kayıt tarihine göre",
} as const;
type SiralamaId = keyof typeof SIRALAMALAR;

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; segment?: string; sira?: string }>;
}) {
  const { q, segment, sira } = await searchParams;
  const arama = q?.trim() ?? "";
  const siralama: SiralamaId = sira === "son" || sira === "yeni" ? sira : "harcama";

  const kullanicilar = await prisma.user.findMany({
    where: {
      role: "USER",
      ...(arama
        ? {
            OR: [
              { email: { contains: arama, mode: "insensitive" as const } },
              { fullName: { contains: arama, mode: "insensitive" as const } },
              { phone: { contains: arama } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      createdAt: true,
      crmTags: true,
      orders: {
        // İptal edilen sipariş ciro sayılmaz.
        where: { status: { not: "CANCELLED" } },
        select: { grandTotal: true, createdAt: true },
      },
      _count: { select: { crmNotes: true } },
    },
    take: 500,
  });

  const satirlar = kullanicilar
    .map((u) => {
      const toplamHarcama = u.orders.reduce((t, o) => t + Number(o.grandTotal), 0);
      const sonSiparis = u.orders.reduce<Date | null>(
        (en, o) => (!en || o.createdAt > en ? o.createdAt : en),
        null
      );
      const olcu = { siparisSayisi: u.orders.length, toplamHarcama, sonSiparis };
      return { ...u, ...olcu, segment: segmentBelirle(olcu), uykuda: uykudaMi(sonSiparis) };
    })
    .filter((r) => !segment || r.segment.id === segment)
    .sort((a, b) => {
      if (siralama === "harcama") return b.toplamHarcama - a.toplamHarcama;
      if (siralama === "son")
        return (b.sonSiparis?.getTime() ?? 0) - (a.sonSiparis?.getTime() ?? 0);
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const ciro = satirlar.reduce((t, r) => t + r.toplamHarcama, 0);
  const alanlar = satirlar.filter((r) => r.siparisSayisi > 0);
  const sayim = (id: SegmentId) =>
    kullanicilar.filter((u) => {
      const toplam = u.orders.reduce((t, o) => t + Number(o.grandTotal), 0);
      return (
        segmentBelirle({
          siparisSayisi: u.orders.length,
          toplamHarcama: toplam,
          sonSiparis: null,
        }).id === id
      );
    }).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Müşteriler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {satirlar.length} kişi · {alanlar.length} tanesi en az bir sipariş verdi
          </p>
        </div>
        <Link
          href="/admin/ziyaretler"
          className="group inline-flex items-center gap-2 text-sm font-medium"
        >
          Ziyaretler
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-card p-5">
          <p className="text-xs text-muted-foreground">Toplam ciro</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatTRY(ciro)}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-5">
          <p className="text-xs text-muted-foreground">Müşteri başına ortalama</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {alanlar.length > 0 ? formatTRY(ciro / alanlar.length) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-5">
          <p className="text-xs text-muted-foreground">Tekrar eden</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {satirlar.filter((r) => r.siparisSayisi > 1).length}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-5">
          <p className="text-xs text-muted-foreground">Uykuda</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {satirlar.filter((r) => r.uykuda).length}
          </p>
        </div>
      </div>

      {/* Arama ve süzme */}
      <form className="flex flex-wrap items-center gap-3" action="/admin/musteriler">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            name="q"
            defaultValue={arama}
            placeholder="Ad, e-posta ya da telefon"
            aria-label="Müşteri ara"
            className="w-full rounded-lg border border-border/60 bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          name="segment"
          defaultValue={segment ?? ""}
          aria-label="Segment"
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
        >
          <option value="">Tüm segmentler</option>
          {Object.values(SEGMENTLER).map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} ({sayim(s.id)})
            </option>
          ))}
        </select>
        <select
          name="sira"
          defaultValue={siralama}
          aria-label="Sıralama"
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
        >
          {Object.entries(SIRALAMALAR).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Uygula
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Segment</th>
                <th className="px-4 py-3 text-right font-medium">Sipariş</th>
                <th className="px-4 py-3 text-right font-medium">Harcama</th>
                <th className="px-4 py-3 font-medium">Son sipariş</th>
                <th className="px-4 py-3 font-medium">Etiket</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-muted-foreground">
                    Eşleşen müşteri yok.
                  </td>
                </tr>
              ) : (
                satirlar.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/musteriler/${r.id}`} className="block">
                        <span className="font-medium">{r.fullName || "—"}</span>
                        <span className="block text-xs text-muted-foreground">{r.email}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.segment.className}`}
                      >
                        {r.segment.label}
                      </span>
                      {r.uykuda && (
                        <span className="ml-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          uykuda
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.siparisSayisi}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.toplamHarcama > 0 ? formatTRY(r.toplamHarcama) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.sonSiparis
                        ? r.sonSiparis.toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.crmTags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                        {r._count.crmNotes > 0 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {r._count.crmNotes} not
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
