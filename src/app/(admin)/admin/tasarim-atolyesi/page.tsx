import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, FileText, Layers, Wrench } from "lucide-react";
import { prisma } from "@/lib/db";
import { RENKLI_PAKET_SECICI, TASARIM_ARACLARI, aracGorseli } from "@/lib/tasarim/catalog";
import { tasarimSku } from "@/lib/tasarim/order";
import {
  atolyeAdresi,
  otomatikIndirmeAdresi,
  uretimEkraniAdresi,
} from "@/lib/tasarim/adresler";
import { resolvePublicImage } from "@/lib/publicAsset";
import { formatTRY } from "@/lib/slicer";
import { ORNEK_SIPARIS_ONEK, ornekSiparisleriGerekirseKur } from "@/lib/tasarim/ornekSiparisler";
import { OrnekSiparisDugmesi } from "@/components/admin/OrnekSiparisDugmesi";

export const dynamic = "force-dynamic";

// ==========================================
// KENDİN ÜRET ATÖLYESİ
//
// Bütün özelleştirilebilir ürünlerin atölye girişi. Her ürün
// için iki yol var:
//
//   - Atölyede aç: araç siparişsiz, üretici kipinde açılır.
//     Model istenen gibi ayarlanır, STL ve imalat dosyaları
//     indirilir (numune, stok, telefonla gelen sipariş).
//   - Siparişler: o ürünün son siparişleri; her biri müşterinin
//     kaydıyla üretim ekranında açılır.
//
// Müşteri bu sayfayı görmez: (admin) yerleşimi rolü
// veritabanından doğrular.
// ==========================================

const DURUM: Record<string, string> = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  PROCESSING: "Hazırlanıyor",
  PRINTING: "Baskıda",
  QUALITY_CHECK: "Kalite kontrol",
  PACKAGING: "Paketleniyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal",
};

const SIPARIS_SAYISI = 3;

/** "Avize STL" → "Avize": düğme artık STL değil 3MF indiriyor */
function parcaAdi(ad: string): string {
  return ad.replace(/\s*\(?STL\)?$/i, "").trim() || ad;
}

export default async function TasarimAtolyesiPage() {
  await ornekSiparisleriGerekirseKur(prisma);
  const kalemler = await prisma.orderItem.findMany({
    where: { productSku: { in: TASARIM_ARACLARI.map((a) => tasarimSku(a.id)) } },
    orderBy: { order: { createdAt: "desc" } },
    take: 400,
    select: {
      id: true,
      orderId: true,
      productSku: true,
      unitPrice: true,
      quantity: true,
      order: {
        select: {
          orderNumber: true,
          status: true,
          createdAt: true,
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const urunSiparisleri = new Map<string, typeof kalemler>();
  for (const k of kalemler) {
    const liste = urunSiparisleri.get(k.productSku ?? "") ?? [];
    liste.push(k);
    urunSiparisleri.set(k.productSku ?? "", liste);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kendin Üret Atölyesi</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Özelleştirilebilir ürünlerin üretici yüzü. Parça düğmeleri baskıya
            hazır 3MF indirir (baskı yönünde dizili, yazıcı ve dilimleme ayarı
            dosyada); siparişin yanındaki 3MF müşterinin modelini sipariş
            adedince hazırlar.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="font-mono text-xs text-muted-foreground">
            {TASARIM_ARACLARI.length} ürün · {kalemler.length} sipariş kalemi
          </p>
          <OrnekSiparisDugmesi
            varMi={kalemler.some((k) => k.order.orderNumber.startsWith(ORNEK_SIPARIS_ONEK))}
          />
        </div>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {TASARIM_ARACLARI.map((arac) => {
          const gorsel = resolvePublicImage(aracGorseli(arac.id));
          const siparisler = urunSiparisleri.get(tasarimSku(arac.id)) ?? [];
          const stl = arac.ciktilar.filter((c) => c.tur === "stl");
          const belge = arac.ciktilar.filter((c) => c.tur !== "stl");
          return (
            <li key={arac.id} className="flex flex-col overflow-hidden rounded-xl adjy-pixel-frame bg-card">
              <div className="flex gap-4 p-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {gorsel && (
                    <Image src={gorsel} alt="" fill sizes="96px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-snug">{arac.ad}</h2>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {tasarimSku(arac.id)} · {arac.malzeme}
                  </p>
                  {/* Parça düğmeleri baskıya hazır 3MF indirir: atölye açılır,
                      model kurulur, üretim projesi kendiliğinden iner */}
                  <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {stl.map((c) => {
                      const tumu = c.sec === RENKLI_PAKET_SECICI;
                      return (
                        <li key={c.sec}>
                          <Link
                            href={otomatikIndirmeAdresi(atolyeAdresi(arac.id), {
                              tur: "3mf",
                              sec: tumu ? null : c.sec,
                            })}
                            title={
                              tumu
                                ? "Bütün parçalar tek dilimleyici projesinde: baskı yönünde dizili, yazıcı ve dilimleme ayarı dosyada"
                                : `${parcaAdi(c.ad)}: baskı yönünde, dilimleme ayarı dosyada`
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
                              tumu
                                ? "bg-foreground font-medium text-background hover:opacity-90"
                                : "bg-muted hover:bg-accent"
                            }`}
                          >
                            {tumu ? (
                              <Layers className="h-3 w-3" aria-hidden />
                            ) : (
                              <Download className="h-3 w-3" aria-hidden />
                            )}
                            {tumu ? "Tüm parçalar · 3MF" : `${parcaAdi(c.ad)} · 3MF`}
                          </Link>
                        </li>
                      );
                    })}
                    {belge.map((c) => (
                      <li key={c.sec}>
                        <Link
                          href={otomatikIndirmeAdresi(atolyeAdresi(arac.id), { tur: "dosya", sec: c.sec })}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <FileText className="h-3 w-3" aria-hidden />
                          {c.ad}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="px-4">
                <Link
                  href={atolyeAdresi(arac.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  <Wrench className="h-4 w-4" aria-hidden />
                  Atölyede aç: modeli ayarla, dosyaları indir
                </Link>
              </div>

              <div className="mt-4 flex-1 border-t-2 border-dashed border-foreground/15 px-4 py-3">
                <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Siparişler</span>
                  <span className="tabular-nums">{siparisler.length}</span>
                </p>
                {siparisler.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Henüz sipariş yok.</p>
                ) : (
                  <ul className="space-y-1">
                    {siparisler.slice(0, SIPARIS_SAYISI).map((k) => (
                      <li key={k.id} className="flex items-center gap-1">
                        <Link
                          href={uretimEkraniAdresi(k.orderId, k.id)}
                          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-xs">
                              {k.order.orderNumber}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {k.order.user.fullName || k.order.user.email} ·{" "}
                              {DURUM[k.order.status] ?? k.order.status} ·{" "}
                              {k.order.createdAt.toLocaleDateString("tr-TR")}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums">
                            {formatTRY(Number(k.unitPrice) * k.quantity)}
                          </span>
                          <ArrowRight
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </Link>
                        <Link
                          href={otomatikIndirmeAdresi(uretimEkraniAdresi(k.orderId, k.id), {
                            tur: "3mf",
                            sec: null,
                          })}
                          title={`${k.order.orderNumber}: müşterinin modeliyle, ${k.quantity} adet, baskıya hazır 3MF`}
                          aria-label={`${k.order.orderNumber} siparişinin 3MF dosyasını indir`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-foreground px-2 py-1 font-mono text-[11px] font-semibold text-background transition-opacity hover:opacity-90"
                        >
                          <Download className="h-3 w-3" aria-hidden />
                          3MF
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
