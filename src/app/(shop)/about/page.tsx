import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { HeroExperience, type HeroProduct } from "@/components/home/HeroExperience";
import { Hero } from "@/components/home/Hero";
import { ConfiguratorShowcase } from "@/components/home/ConfiguratorShowcase";
import { SpaceShowcase, type SpaceScene } from "@/components/home/SpaceShowcase";
import { DigitalToPhysical } from "@/components/home/DigitalToPhysical";
import { ARShowcase, type ARProduct } from "@/components/home/ARShowcase";
import { SectionHeading } from "@/components/ui/section-heading";
import { getProductType } from "@/lib/productType";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "ADJY; 3D baskı, seramik ve alçı ile dekoratif ürünler üretir. Ölçüsünü kendinize göre belirleyebileceğiniz ürünler, kendi atölyemizden.",
};

// ==========================================
// HAKKIMIZDA
//
// Burası iki ayrı sayfanın üst üste yığılmış hâliydi: önce
// kurumsal bir tanıtım, altında ana sayfadan taşınmış anlatı
// bölümleri. İkisi birbirine bağlanmıyordu.
//
// Sayfa tek bir anlatıya göre yeniden dizildi:
//
//   01  Nesneler, yeniden   — markanın fikri, kaydırmalı anlatı
//   02  Biz kimiz           — neden başladık + hemen bir çıkış kapısı
//   03  Ölçüsü sana göre    — konfigüratör, burada çalışıyor
//   04  Mekâna göre         — aynı nesne, farklı alanlar
//   05  Odanda gör          — AR, anlatılmıyor, açılıyor
//   06  Dijitalden fiziksele— nesnenin yolculuğu
//   07  Nasıl üretiyoruz    — malzeme ve atölye, somut
//   08  Neden ADJY          — dört madde
//   09  Kapanış
//
// Özellikler madde madde sayılmıyor, çalışır hâlde gösteriliyor:
// konfigüratör sürüklenebiliyor, AR telefonda açılıyor. Okunan
// bir vaat yerine denenen bir şey.
// ==========================================

const REASONS = [
  {
    title: "Ölçüsü sana göre",
    body: "Çoğu ürünün enini ve boyunu kendi alanınıza göre belirleyebilirsiniz; fiyat da ölçüyle birlikte güncellenir.",
  },
  {
    title: "Almadan önce gör",
    body: "Ürünü telefonunuzla kendi odanızda, gerçek ölçüsünde görüntüleyebilirsiniz.",
  },
  {
    title: "Birden fazla malzeme",
    body: "3D baskı (PLA, PETG, ABS), seramik ve alçı — işe uygun olanı seçiyoruz.",
  },
  {
    title: "Kendi atölyemiz",
    body: "Üretim bizde olduğu için tek parçalık siparişi de aynı özenle yapıyoruz.",
  },
];

const STEPS = [
  { n: "01", title: "Seç ya da kur", body: "Hazır bir ürünü seçin ya da ölçüsünü kendiniz belirleyin." },
  { n: "02", title: "Üretim", body: "Ürüne göre 3D baskı, seramik ya da alçı ile üretiyoruz." },
  { n: "03", title: "Kontrol", body: "Her parça elden geçer, kusurlu olan yola çıkmaz." },
  { n: "04", title: "Teslimat", body: "Kırılabilir parçalar ayrı korumayla paketlenir." },
];


/** Hero: scroll ile sürülebilmesi için "width" parametresi olan bir ürün */
async function getHeroProduct(): Promise<HeroProduct | null> {
  try {
    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        parameters: {
          some: { name: "width", minValue: { not: null }, maxValue: { not: null } },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        thumbnailUrl: true,
        category: { select: { name: true } },
        parameters: {
          where: { name: "width" },
          select: { minValue: true, maxValue: true, defaultValue: true },
          take: 1,
        },
      },
    });

    const width = product?.parameters[0];
    if (!product || !width || width.minValue === null || width.maxValue === null) {
      return null;
    }
    if (width.maxValue <= width.minValue) return null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      thumbnailUrl: product.thumbnailUrl,
      productType: getProductType(product.slug),
      category: product.category,
      widthRange: {
        min: width.minValue,
        max: width.maxValue,
        default: Number(width.defaultValue) || width.minValue,
      },
    };
  } catch {
    return null;
  }
}



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



/** "Alanına göre" sekmeleri: her kategoriden görseli olan bir ürün */
async function getSpaceScenes(): Promise<SpaceScene[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        name: true,
        slug: true,
        thumbnailUrl: true,
        category: { select: { name: true, slug: true } },
        parameters: {
          where: {
            type: "SLIDER",
            minValue: { not: null },
            maxValue: { not: null },
          },
          orderBy: { sortOrder: "asc" },
          select: {
            displayName: true,
            minValue: true,
            maxValue: true,
            defaultValue: true,
          },
          take: 1,
        },
      },
    });

    const seen = new Set<string>();
    const scenes: SpaceScene[] = [];
    for (const row of rows) {
      if (seen.has(row.category.slug)) continue;
      seen.add(row.category.slug);

      // Ölçek çizimi yalnızca gerçek bir aralık varsa çizilir
      const param = row.parameters[0];
      const width =
        param &&
        param.minValue !== null &&
        param.maxValue !== null &&
        param.maxValue > param.minValue
          ? {
              min: param.minValue,
              max: param.maxValue,
              default: Number(param.defaultValue) || param.minValue,
              label: param.displayName,
            }
          : null;

      scenes.push({
        label: row.category.name,
        categoryName: row.category.name,
        categorySlug: row.category.slug,
        product: {
          name: row.name,
          slug: row.slug,
          thumbnailUrl: row.thumbnailUrl,
        },
        width,
      });
      if (scenes.length === 4) break;
    }
    return scenes;
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

/** Katalog büyüklüğü — "33 nesne" gibi somut bir sayı soyut bir vaatten iyidir */
async function getCatalogStats() {
  try {
    const [urun, ozellestirilebilir] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, parameters: { some: {} } } }),
    ]);
    return { urun, ozellestirilebilir };
  } catch {
    return { urun: 0, ozellestirilebilir: 0 };
  }
}

export default async function AboutPage() {
  const [heroProduct, configuratorProducts, spaceScenes, arProduct, stats] =
    await Promise.all([
      getHeroProduct(),
      getConfiguratorProducts(),
      getSpaceScenes(),
      getArProduct(),
      getCatalogStats(),
    ]);

  return (
    <>
      {/* 01 — Nesneler, yeniden */}
      {heroProduct ? <HeroExperience product={heroProduct} /> : <Hero product={null} />}

      {/* 02 — Biz kimiz. Çıkış kapısı sayfanın sonunu beklemez. */}
      <section className="border-t border-border/60">
        <div className="adjy-container grid gap-10 py-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16 lg:py-24">
          <div>
            <p className="adjy-eyebrow mb-5">Hakkımızda</p>
            {/* Sayfanın h1'i yukarıdaki anlatıda ("Nesneler, yeniden.");
                burada ikinci bir h1 olursa sayfada iki başlık olur. */}
            <h2 className="adjy-display text-[clamp(1.9rem,4vw,2.9rem)] leading-[1.08]">
              Tasarımı ürüne çeviriyoruz.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                ADJY bir soruyla başladı: beğendiğiniz bir ürün neden tam da
                sizin rafınıza göre olmuyor? Katalogdaki raf ya iki santim uzun
                geliyor ya da tam oturduğu yerde başka bir şey eksik kalıyor.
              </p>
              <p>
                Biz ürünleri sabit ölçülü parçalar olarak değil, ölçüsü
                belirlenebilen tasarımlar olarak kuruyoruz. Kendi atölyemizde
                3D baskı, seramik ve alçı ile üretiyoruz; sipariş gelmeden
                hiçbir şey basılmıyor, tek parçalık iş de aynı özenle
                yapılıyor.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Ürünleri görün
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/products?customizable=true"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Özel ölçüde üretim
              </Link>
            </div>
          </div>

          {stats.urun > 0 && (
            <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-xl border border-border bg-border">
              <div className="bg-background p-6">
                <dt className="text-xs text-muted-foreground">Katalogdaki ürün</dt>
                <dd className="mt-1.5 text-2xl font-medium tabular-nums">{stats.urun}</dd>
              </div>
              <div className="bg-background p-6">
                <dt className="text-xs text-muted-foreground">Ölçüsü değişen</dt>
                <dd className="mt-1.5 text-2xl font-medium tabular-nums">
                  {stats.ozellestirilebilir}
                </dd>
              </div>
              <div className="bg-background p-6">
                <dt className="text-xs text-muted-foreground">Malzeme</dt>
                <dd className="mt-1.5 text-2xl font-medium">3</dd>
                <dd className="mt-1 text-xs text-muted-foreground">
                  3D baskı · seramik · alçı
                </dd>
              </div>
              <div className="bg-background p-6">
                <dt className="text-xs text-muted-foreground">Üretim</dt>
                <dd className="mt-1.5 text-2xl font-medium">Kendi atölyemiz</dd>
                <dd className="mt-1 text-xs text-muted-foreground">Beşiktaş, İstanbul</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* 03 — Ölçüsü sana göre: burada çalışan bir konfigüratör */}
      {configuratorProducts.length > 0 && (
        <section className="adjy-container adjy-section border-t border-border/60">
          <SectionHeading
            eyebrow="Ölçüsü sana göre"
            title="Ölçüyü siz belirleyin."
            description="Ölçüyü değiştirdiğinizde ürün de anında onunla değişir. Fiyat da ölçüye göre güncellenir — sipariş vermeden önce ne ödeyeceğinizi görürsünüz."
            action={{ label: "Ölçüsü değişenler", href: "/products?customizable=true" }}
          />
          <div className="mt-8">
            <ConfiguratorShowcase products={configuratorProducts} />
          </div>
        </section>
      )}

      {/* 04 — Aynı nesne, farklı alanlar */}
      <SpaceShowcase scenes={spaceScenes} />

      {/* 05 — Odanda gör */}
      <ARShowcase product={arProduct} />

      {/* 06 — Nesnenin yolculuğu */}
      <DigitalToPhysical />

      {/* 07 — Nasıl üretiyoruz */}
      <section className="adjy-container adjy-section border-t border-border/60">
        <SectionHeading
          eyebrow="Üretim"
          title="Nasıl üretiyoruz?"
          description="Sipariş gelmeden hiçbir şey basılmaz; her parça yola çıkmadan elden geçer."
        />
        <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-background p-6">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {s.n}
              </span>
              <h3 className="mt-6 text-[15px] font-medium tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 08 — Neden ADJY */}
      <section className="adjy-container adjy-section border-t border-border/60">
        <SectionHeading eyebrow="Neden ADJY" title="Bizi ayıran dört şey" />
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.title} className="bg-background p-6">
              <h3 className="text-[15px] font-medium tracking-tight">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 09 — Kapanış */}
      <section className="border-t border-border/60">
        <div className="adjy-container flex flex-col gap-6 py-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="adjy-display text-[clamp(1.4rem,2.6vw,2rem)]">
              Aklında bir şey mi var?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Kendi modelinizi ürettirebilir, bir fotoğraftan yeni bir ürün
              oluşturabilir ya da aklınızdakini bize yazabilirsiniz.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/uret"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Üret
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Bize yaz
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
