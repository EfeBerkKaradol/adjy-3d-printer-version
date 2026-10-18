import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { AboutOpening, type AcilisGorsel } from "@/components/home/AboutOpening";
import { ConfiguratorShowcase } from "@/components/home/ConfiguratorShowcase";
import { ARShowcase, type ARProduct } from "@/components/home/ARShowcase";
import { HowWeMake } from "@/components/home/HowWeMake";
import { HonestLimits } from "@/components/home/HonestLimits";
import { SectionHeading } from "@/components/ui/section-heading";
import { COMPANY, formatAddress, mapsLink } from "@/lib/company";
import { getProductType } from "@/lib/productType";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "ADJY, ev ve çalışma masası için dekoratif ürünler üretir. Çoğunun ölçüsünü siz belirlersiniz; üretim Beşiktaş'taki kendi atölyemizde, sipariş geldikten sonra başlar.",
};

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
//   03  Ölçüyü siz verirsiniz — anlatılmıyor, çalıştırılıyor
//   04  Odanızda görün      — aynı şekilde
//   05  Nasıl üretiyoruz    — adımlar ve ölçülebilir değerler
//   06  Yapamadıklarımız    — sayfayı ayıran bölüm
//   07  Nerede              — gerçek adres, gerçek kapı
//
// Sıfat yerine rakam: "kaliteli üretim" demiyoruz, 0,2 mm
// katman ve 45 × 45 cm tabla diyoruz.
// ==========================================


/** Ana sayfa konfigüratörü: ölçüsü değişebilen 4 nesne */
async function getConfiguratorProducts() {
  try {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        parameters: {
          some: { type: "SLIDER", minValue: { not: null }, maxValue: { not: null } },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePrice: true,
        thumbnailUrl: true,
        modelFileUrl: true,
        materialType: true,
        category: { select: { name: true } },
        parameters: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            minValue: true,
            maxValue: true,
            defaultValue: true,
            step: true,
            unit: true,
          },
        },
      },
    });

    return rows.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      productType: getProductType(p.slug),
    }));
  } catch {
    return [];
  }
}



/**
 * AR gösterimi için nesne: modeli olan, ölçüsü kayıtlı ve
 * görseli olan bir ürün. Üçü birden yoksa bölüm gizlenir —
 * çalışmayan bir "Odanda Gör" düğmesi, hiç olmamasından kötü.
 */
async function getArProduct(): Promise<ARProduct | null> {
  try {
    const p = await prisma.product.findFirst({
      where: {
        isActive: true,
        modelFileUrl: { not: null },
        thumbnailUrl: { not: null },
        widthMm: { not: null },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        thumbnailUrl: true,
        modelFileUrl: true,
        widthMm: true,
        depthMm: true,
        heightMm: true,
        category: { select: { name: true } },
        parameters: { select: { name: true, defaultValue: true } },
      },
    });
    if (!p) return null;

    return {
      ...p,
      defaultParameters: Object.fromEntries(
        p.parameters.map((q) => {
          const sayi = Number(q.defaultValue);
          return [q.name, Number.isFinite(sayi) ? sayi : q.defaultValue];
        })
      ),
    };
  } catch {
    return null;
  }
}

/** Açılıştaki büyük kare ve üretim bölümündeki görsel */
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
      prisma.product.count({ where: { isActive: true, parameters: { some: {} } } }),
    ]);
    return { urun, olcu };
  } catch {
    return { urun: 0, olcu: 0 };
  }
}

export default async function AboutPage() {
  const [gorseller, sayilar, configuratorProducts, arProduct] = await Promise.all([
    getGorseller(),
    getSayilar(),
    getConfiguratorProducts(),
    getArProduct(),
  ]);

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
      <section className="border-t border-border/60 bg-muted/30">
        <div className="adjy-container py-16 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="adjy-eyebrow mb-6">Neden</p>
            <p className="adjy-display text-[clamp(1.6rem,3.2vw,2.4rem)] leading-[1.25]">
              Bir raf iki santim uzun geldiği için geri gönderilmez. Orada
              durur, biraz yanlış durur, her gün biraz rahatsız eder.
            </p>
            <div className="mt-8 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Katalog, ürünü ortalama bir eve göre tasarlar. Sizin eviniz
                ortalama değil: rafın boşluğu 38 santim, pencerenin önü dar,
                masanın kenarı kısa kalıyor.
              </p>
              <p>
                ADJY bu yüzden ürünleri sabit ölçülü parçalar olarak değil,
                ölçüsü belirlenebilen tasarımlar olarak kuruyor. Ölçüyü
                siz verdiğiniz için üretim de ancak siz söyledikten sonra
                başlıyor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — Ölçüyü siz verirsiniz: anlatılmıyor, çalıştırılıyor */}
      {configuratorProducts.length > 0 && (
        <section className="adjy-container adjy-section border-t border-border/60">
          <SectionHeading
            eyebrow="Özel ölçüde üretim"
            title="Ölçüyü siz belirleyin."
            description="Kaydırıcıyı çekin: ürün de fiyat da anında değişsin. Burada denediğiniz şey, mağazada sipariş verirken kullandığınızın aynısı."
            action={{ label: "Özel ölçülü ürünler", href: "/products?customizable=true" }}
          />
          <div className="mt-8">
            <ConfiguratorShowcase products={configuratorProducts} />
          </div>
        </section>
      )}

      {/* 04 — Odanızda görün */}
      <ARShowcase product={arProduct} />

      {/* 05 — Nasıl üretiyoruz */}
      <HowWeMake gorsel={gorseller.uretim} />

      {/* 06 — Yapamadıklarımız */}
      <HonestLimits />

      {/* 07 — Nerede */}
      <section className="border-t border-border/60">
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
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Ürünleri görün
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Bize yazın
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
