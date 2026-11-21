import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { aracAdresi, slugdanAracId } from "@/lib/tasarim/catalog";
import { prisma } from "@/lib/db";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductExperience } from "@/components/product/ProductExperience";
import { ProductGrid } from "@/components/product/ProductGrid";
import { readGallery, secondImageOf } from "@/lib/gallery";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { productDescription, productKeywords, productTitle } from "@/lib/seo";
import { getAbsoluteUrl } from "@/lib/url";
import { getProductType } from "@/lib/productType";
import { formatCmValue } from "@/lib/units";
import {
  ArrowRight,
  Clock,
  Hammer,
  Layers,
  RotateCcw,
  Ruler,
  Star,
  Truck,
  Weight,
} from "lucide-react";
import { formatPrintTime } from "@/lib/slicer";

const GUVENCELER = [
  { ikon: Hammer, baslik: "Siparişe özel üretim", alt: "2–5 iş gününde kargoda", href: "/faq" },
  { ikon: Truck, baslik: "Ücretsiz kargo", alt: "500 TL ve üzeri", href: "/teslimat-politikasi" },
  { ikon: RotateCcw, baslik: "14 gün iade", alt: "Cayma hakkı", href: "/iade-politikasi" },
];

// ==========================================
// ÜRÜN DETAY SAYFASI
// Solda galeri (yapışkan), sağda satın alma alanı.
// Satın alma alanının altındaki bilgiler açılır
// başlıklarda toplanır — sayfa açılışında yalnızca
// karar için gereken bilgi görünür.
//
// Varyant (renk/beden) seçici bilinçli olarak yok:
// sepet store'u varyant taşımıyor, seçim sipariş
// kaydına yansımazdı.
// ==========================================

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Ürün sayfası her istekte baştan çiziliyordu; içinde ziyaretçiye
// ya da isteğe özel hiçbir şey yok (sepet, favori ve yorumlar
// tarayıcıda yüklenir). Beş dakikalığına saklanır.
//
// Derleme anında hiçbir ürün üretilmez (liste boş): veritabanına
// derlemede dokunulmaz, her ürün ilk ziyaretinde çizilip saklanır.
// Yönetim panelindeki değişiklikler beş dakikayı beklemez — ilgili
// uçlar sayfayı düşürür (bkz. ../onbellek.ts).
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

// cache(): generateMetadata ile sayfa aynı ürünü ayrı ayrı
// soruyordu; aynı çizimde tek sorguya iner.
const getProduct = cache(async (slug: string) => {
  const byId = /^c[a-z0-9]{24,}$/.test(slug);
  const where = byId ? { id: slug, isActive: true } : { slug, isActive: true };

  // Puan ortalaması veritabanında hesaplanır: ortalama almak için
  // bütün yorum satırlarını çekmek gerekmiyor. Ürün sorgusuyla
  // yan yana çalışır.
  const [product, puan] = await Promise.all([
    prisma.product.findFirst({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        basePrice: true,
        thumbnailUrl: true,
        gallery: true,
        printTimeEst: true,
        materialType: true,
        materialWeight: true,
        widthMm: true,
        depthMm: true,
        heightMm: true,
        customMouldFee: true,
        stockQty: true,
        featured: true,
        category: { select: { id: true, name: true, slug: true, parentId: true } },
      },
    }),
    prisma.review.aggregate({
      where: { product: where },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  if (!product) return null;

  const avgRating = puan._avg.rating ?? 0;

  return {
    ...product,
    basePrice: Number(product.basePrice),
    materialWeight: product.materialWeight ? Number(product.materialWeight) : null,
    stockQty: product.stockQty ?? 999,
    reviews: {
      averageRating: Math.round(avgRating * 10) / 10,
      totalCount: puan._count._all,
    },
  };
});

/** gallery alanı Json — yalnızca string dizisi olduğunda kullanılır */
async function getRelated(categoryId: string, parentId: string | null, excludeId: string) {
  try {
    // Aynı ana kategorinin ailesi: kendi alt kategorisi önce, sonra kardeşleri
    const familyId = parentId ?? categoryId;
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: excludeId },
        category: { OR: [{ id: familyId }, { parentId: familyId }] },
      },
      take: 4,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        thumbnailUrl: true,
        gallery: true,
        featured: true,
        category: { select: { name: true, slug: true } },
        _count: { select: { reviews: true, parameters: true } },
      },
    });
    return rows.map(({ gallery, ...p }) => ({
      ...p,
      basePrice: Number(p.basePrice),
      hoverImageUrl: secondImageOf(p.thumbnailUrl, gallery),
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "Ürün bulunamadı" };

  // Başlık ve açıklama ürünün kendi verisinden üretilir:
  // üretim türü ve fiyat aranan ifadelerdir. Hazır ürünün ölçüsü
  // seçilmez; "… cm arası seçilebilir" yazılmaz.
  const seoInput = {
    name: product.name,
    description: product.description,
    basePrice: product.basePrice,
    categoryName: product.category.name,
    materialType: product.materialType ?? null,
    dimensions: [],
  };

  const title = productTitle(seoInput);
  const description = productDescription(seoInput);

  return {
    title,
    description,
    keywords: productKeywords(seoInput),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${title} | ADJY`,
      description,
      url: `/products/${product.slug}`,
      ...(product.thumbnailUrl && { images: [{ url: product.thumbnailUrl }] }),
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  // Tasarım aracıyla kurulan ürünlerin bakılacak hazır bir hâli
  // yok; ürün sayfası yerine araca gidilir. Mağaza kartları zaten
  // oraya bağlanıyor — bu, dışarıdan gelen bağlantılar için.
  const tasarimAraci = slugdanAracId(slug);
  if (tasarimAraci) redirect(aracAdresi(tasarimAraci));
  const product = await getProduct(slug);

  if (!product) notFound();

  const related = await getRelated(product.category.id, product.category.parentId, product.id);
  const baseUrl = getAbsoluteUrl();

  const gallery = readGallery(product.gallery);
  // Kapak karesi galerinin de ilk öğesi olduğu için liste
  // tekilleştirilir; aynı adres iki kez gelince React aynı
  // anahtarla iki çocuk uyarısı veriyordu.
  const images = [
    ...new Set(
      [product.thumbnailUrl, ...gallery].filter(
        (src): src is string => Boolean(src)
      )
    ),
  ];

  // Bu sayfadaki ürünler hazır ürünler: ölçü ayarı ve 3B model
  // gösterilmez, yalnızca görseller ve renderlar. Ayarlanabilir
  // ürünler Kendin Üret araçlarıdır (/tasarla); onların ürün
  // satırı yukarıda araca yönlendirilir. Baskı dosyaları müşteriye
  // değil atölyeye aittir (admin sipariş ekranı).

  // Montajlı dış ölçü. Derinlik her üründe kayıtlı değil;
  // olmayan eksen yazılmaz.
  const olcuEksenleri = [product.widthMm, product.depthMm, product.heightMm].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  const olcuMetni =
    olcuEksenleri.length >= 2
      ? `${olcuEksenleri.map((v) => formatCmValue(v)).join(" × ")} cm`
      : null;

  // Künye: yalnız kayıtlı alanlar yazılır. Baskı süresi saat ve
  // dakika olarak (1644 dakika değil, 27 sa 24 dk).
  const kunye = [
    olcuMetni && { ikon: Ruler, etiket: "Ölçü", deger: olcuMetni },
    product.materialType && { ikon: Layers, etiket: "Malzeme", deger: product.materialType },
    product.materialWeight && {
      ikon: Weight,
      etiket: "Ağırlık",
      deger: `${product.materialWeight.toLocaleString("tr-TR")} g`,
    },
    product.printTimeEst && {
      ikon: Clock,
      etiket: "Baskı süresi",
      deger: formatPrintTime(product.printTimeEst),
    },
  ].filter((k): k is { ikon: typeof Ruler; etiket: string; deger: string } => Boolean(k));

  return (
    <div className="pb-20">
      <BreadcrumbJsonLd
        items={[
          { name: "Mağaza", url: `${baseUrl}/products` },
          {
            name: product.category.name,
            url: `${baseUrl}/products?category=${product.category.slug}`,
          },
          { name: product.name, url: `${baseUrl}/products/${product.slug}` },
        ]}
      />

      <ProductJsonLd
        name={product.name}
        description={product.description || ""}
        price={product.basePrice}
        image={product.thumbnailUrl}
        url={`${baseUrl}/products/${product.slug}`}
        sku={product.sku}
        stockQty={product.stockQty}
        category={product.category.name}
        rating={
          product.reviews.totalCount > 0
            ? {
                average: product.reviews.averageRating,
                count: product.reviews.totalCount,
              }
            : undefined
        }
      />

      <div className="adjy-container">
        {/* Breadcrumb */}
        <nav aria-label="Konum" className="py-6">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <li>
              <Link href="/products" className="transition-colors hover:text-foreground">
                Mağaza
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="transition-colors hover:text-foreground"
              >
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground">{product.name}</li>
          </ol>
        </nav>

        {/* Görsel solda; ad, fiyat, sepet ve künye sağ sütunda.
            Önceden ad tam genişlikte üstteydi, fiyatın altı boştu ve
            özellikler sayfanın altında boş bir sütunun yanında,
            kapalı bir akordeonun içindeydi. */}
        <ProductExperience
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            basePrice: product.basePrice,
            thumbnailUrl: product.thumbnailUrl,
            images,
            modelFileUrl: null,
            productType: getProductType(product.slug),
            stockQty: product.stockQty,
            customMouldFee: product.customMouldFee ? Number(product.customMouldFee) : null,
            parameters: [],
          }}
          ust={
            <header>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="adjy-eyebrow transition-colors hover:text-foreground"
                >
                  {product.category.name}
                </Link>
                {product.reviews.totalCount > 0 && (
                  <a
                    href="#degerlendirmeler"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                    <span className="font-medium tabular-nums text-foreground">
                      {product.reviews.averageRating.toLocaleString("tr-TR")}
                    </span>
                    · {product.reviews.totalCount} değerlendirme
                  </a>
                )}
              </div>
              <h1 className="adjy-display mt-3 text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.05]">
                {product.name}
              </h1>
              {product.description && (
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}
            </header>
          }
          alt={
            <>
              {/* Güvenceler */}
              <ul className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-foreground/15 bg-foreground/10 sm:grid-cols-3">
                {GUVENCELER.map(({ ikon: Ikon, baslik, alt: altMetin, href }) => (
                  <li key={baslik} className="bg-background">
                    <Link
                      href={href}
                      className="flex h-full items-start gap-3 p-4 transition-colors hover:bg-muted/50"
                    >
                      <Ikon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="text-sm leading-snug">
                        <span className="block font-medium">{baslik}</span>
                        <span className="block text-xs text-muted-foreground">{altMetin}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Teknik künye */}
              {kunye.length > 0 && (
                <section className="mt-10" aria-labelledby="kunye-baslik">
                  <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-foreground/25 pb-3">
                    <h2 id="kunye-baslik" className="text-sm font-semibold">
                      Teknik künye
                    </h2>
                    {product.sku && (
                      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
                        {product.sku}
                      </span>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6">
                    {kunye.map(({ ikon: Ikon, etiket, deger }) => (
                      <div key={etiket} className="border-b border-foreground/10 py-4">
                        <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                          <Ikon className="h-3.5 w-3.5" aria-hidden />
                          {etiket}
                        </dt>
                        <dd className="mt-1.5 text-lg font-medium tabular-nums leading-tight">
                          {deger}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {/* Ayrıntılar */}
              <Accordion type="multiple" className="mt-8 border-t border-dashed border-foreground/25">
                <AccordionItem value="uretim" className="border-b border-dashed border-foreground/25">
                  <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                    Nasıl üretiliyor?
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    Sipariş alındıktan sonra {product.materialType ?? "PLA"} ile katman
                    katman basılır
                    {product.printTimeEst
                      ? ` (baskı yaklaşık ${formatPrintTime(product.printTimeEst)} sürer)`
                      : ""}
                    . Baskı bitince destek yapıları temizlenir, yüzey elden geçirilir,
                    kontrol edilip paketlenir. Ortalama sipariş 2–5 iş gününde kargoya
                    verilir.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="teslimat" className="border-b border-dashed border-foreground/25">
                  <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                    Teslimat ve iade
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    500 TL üzeri siparişlerde kargo ücretsiz. Kargo ve teslimat koşulları
                    için{" "}
                    <Link href="/teslimat-politikasi" className="underline underline-offset-4">
                      teslimat politikası
                    </Link>
                    , iade koşulları için{" "}
                    <Link href="/iade-politikasi" className="underline underline-offset-4">
                      iade politikası
                    </Link>{" "}
                    sayfasına bakabilirsin.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          }
        />

        {/* Değerlendirmeler */}
        <div id="degerlendirmeler" className="mt-20 scroll-mt-24 border-t-2 border-dashed border-foreground/25 pt-12">
          <ProductReviews productId={product.id} />
        </div>

        {/* İlgili ürünler */}
        {related.length > 0 && (
          <section className="mt-20 border-t-2 border-dashed border-foreground/25 pt-12" aria-label="İlgili ürünler">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-xl font-medium tracking-tight md:text-2xl">
                {product.category.name} kategorisinden
              </h2>
              <Link
                href={`/products?category=${product.category.slug}`}
                className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
              >
                Tümü
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </div>
  );
}
