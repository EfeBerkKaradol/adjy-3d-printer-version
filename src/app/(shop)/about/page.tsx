import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PixelLink } from "@/components/ui/pixel-link";
import { prisma } from "@/lib/db";
import { AboutOpening, type AcilisGorsel } from "@/components/home/AboutOpening";
import { HowWeMake } from "@/components/home/HowWeMake";
import { HonestLimits } from "@/components/home/HonestLimits";
import { SectionHeading } from "@/components/ui/section-heading";
import { COMPANY, formatAddress, mapsLink } from "@/lib/company";

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Hakkımızda",
  description:
    "ADJY, Beşiktaş'taki kendi atölyesinde siparişe özel ev ve masa ürünleri üretir: vazo, saksı, aydınlatma, düzenleyici ve kişiye özel hediyeler. Ölçüsünü, rengini ve yazısını siz seçersiniz.",
  path: "/about",
});

// ==========================================
// HAKKIMIZDA
//
// Sayfa üst üste yığılmış gri metin kutularıydı: üç ayrı
// dört-kutulu ızgara, hepsi birbirine benzeyen küçük
// paragraflar. Bir de kaydırmayı ele geçiren uzun bir 3D
// anlatıyla açılıyordu — bizi merak eden biri kaydırmayı
// kendisi yönetmek ister.
//
// Yeni sıra, Türkçe ve yabancı kaynakların ortaklaştığı yerden:
//
//   01  Ne yapıyoruz        — tek cümle, sonra dört sayı
//   02  Neden başladık      — kısa, somut bir hikâye
//   03  Kendin Üret         — ayarlanabilir ürünlere bağlantı
//   04  Nasıl üretiyoruz    — adımlar ve ölçülebilir değerler
//   05  Yapamadıklarımız    — sayfayı ayıran bölüm
//   06  Nerede              — gerçek adres, gerçek kapı
//
// Hazır ürünlerin 3B modeli ve ölçü kaydırıcısı gösterilmez;
// ayarlanabilir ürünler yalnızca Kendin Üret araçları.
//
// Sıfat yerine rakam: "kaliteli üretim" demiyoruz, 0,2 mm
// katman ve 45 × 45 cm tabla diyoruz.
// ==========================================


async function getGorseller(): Promise<{ acilis: AcilisGorsel | null; uretim: string | null }> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { name: true, slug: true, thumbnailUrl: true },
    });
    return { acilis: rows[0] ?? null, uretim: rows[2]?.thumbnailUrl ?? null };
  } catch {
    return { acilis: null, uretim: null };
  }
}

/** Sayfadaki rakamlar katalogdan gelir; elle yazılan sayı eskir */
async function getSayilar() {
  try {
    const [urun, olcu] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, slug: { startsWith: "tasarla-" } } }),
    ]);
    return { urun, olcu };
  } catch {
    return { urun: 0, olcu: 0 };
  }
}

export default async function AboutPage() {
  const [gorseller, sayilar] = await Promise.all([getGorseller(), getSayilar()]);

  const adres = COMPANY.address;
  const harita = mapsLink();

  return (
    <>
      {/* 01 — Ne yapıyoruz */}
      <AboutOpening
        gorsel={gorseller.acilis}
        urunSayisi={sayilar.urun}
        olcuSayisi={sayilar.olcu}
      />

      {/* 02 — Neden başladık */}
      <section className="border-t-2 border-dashed border-foreground/25 bg-muted/30">
        <div className="adjy-container py-16 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="adjy-eyebrow mb-6">Neden</p>
            <p className="adjy-display text-[clamp(1.6rem,3.2vw,2.4rem)] leading-[1.25]">
              Seri üretim herkese aynı ürünü satar. Biz her siparişi, onu
              isteyen kişi için basıyoruz.
            </p>
            <div className="mt-8 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Mağaza raflarındaki ürünler ortalama bir eve göre çizilir.
                Oysa sizin rafınızın boşluğu 38 santim, pencerenizin önü dar,
                hediye edeceğiniz kişinin adı da o hazır ürünün üstünde yazmıyor.
              </p>
              <p>
                ADJY bu yüzden ürünlerini sabit kalıplar olarak değil,
                kurulabilen tasarımlar olarak hazırlıyor. Ölçüyü, rengi,
                yazıyı ya da fotoğrafı siz seçiyorsunuz; seçiminiz modelde ve
                fiyatta anında görünüyor. Üretim siparişinizle başlıyor, bu
                yüzden ne stok fazlası ne de depoda bekleyen bir ürün var.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — Kendin Üret: ayarlanabilir ürünler */}
      <section className="adjy-container adjy-section border-t-2 border-dashed border-foreground/25">
        <SectionHeading
          eyebrow="Kendin tasarla"
          title="Ürünü siz kurun, biz basalım."
          description="Ses kaydınızdan plaket, fotoğrafınızdan yapboz ya da hediye kutusu, adınızla isimlik, bitkinize göre saksı. Her ürünün kendi tasarım aracı var: değiştirdiğiniz her ayar modelde ve fiyatta anında görünür."
          action={{ label: "Kendin tasarla", href: "/tasarla" }}
        />
      </section>

      {/* 04 — Nasıl üretiyoruz */}
      <HowWeMake gorsel={gorseller.uretim} />

      {/* 05 — Yapamadıklarımız */}
      <HonestLimits />

      {/* 06 — Nerede */}
      <section className="border-t-2 border-dashed border-foreground/25">
        <div className="adjy-container grid gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div>
            <p className="adjy-eyebrow mb-5">Nerede</p>
            <h2 className="adjy-display text-[clamp(1.6rem,3vw,2.3rem)] leading-[1.15]">
              Atölye burada.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Ürünlerin basıldığı, döküldüğü ve paketlendiği yer tek bir yer:
              Beşiktaş&apos;taki atölyemiz. Sipariş vermeden önce sormak
              istediğiniz bir şey varsa yazın, aynı iş günü içinde dönüyoruz.
            </p>
          </div>

          <div className="lg:justify-self-end">
            {adres && (
              <address className="not-italic text-base leading-relaxed">
                {adres.line1}
                <br />
                {adres.line2}
                <br />
                {adres.postalCode} {adres.district}/{adres.city}
              </address>
            )}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {COMPANY.email && (
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="underline-offset-4 hover:underline"
                >
                  {COMPANY.email}
                </a>
              )}
              {COMPANY.phone && (
                <a
                  href={`tel:${COMPANY.phone.replace(/[^+\d]/g, "")}`}
                  className="underline-offset-4 hover:underline"
                >
                  {COMPANY.phone}
                </a>
              )}
              {harita && (
                <a
                  href={harita}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  Yol tarifi
                </a>
              )}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <PixelLink href="/products" variant="solid">
                Ürünleri görün
              </PixelLink>
              <PixelLink href="/contact">Bize yazın</PixelLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
