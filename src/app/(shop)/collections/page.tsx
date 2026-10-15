import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CategoryGrid, type HomeCategory } from "@/components/home/CategoryGrid";
import { Button } from "@/components/ui/button";
import { resolvePublicImage } from "@/lib/publicAsset";
import { ArrowRight } from "lucide-react";
import { MATERIAL_FAMILIES, familyFor } from "@/lib/materialFamily";

// Kategoriler ve ürün sayıları yarım saatte bir tazelenir
export const revalidate = 1800;

// ==========================================
// KOLEKSİYONLAR
// Kategorileri tek bir sayfada toplar. Ürün listeleme
// mantığı /products'ta kalır; burası yalnızca giriş kapısı.
// ==========================================

export const metadata: Metadata = {
  title: "Koleksiyonlar",
  description:
    "ADJY koleksiyonlarını keşfedin: ev dekorasyonu, ofis aksesuarları, teknik parçalar ve daha fazlası.",
  alternates: { canonical: "/collections" },
  openGraph: {
    title: "Koleksiyonlar | ADJY",
    description: "ADJY koleksiyonlarını kategorilere göre keşfedin.",
  },
};

/**
 * Koleksiyon kartlarının kapak görselleri.
 *
 * Kategorilerin kendi imageUrl'leri public/ altında karşılığı
 * olmayan dosyalara işaret ediyor, bu yüzden kartlar soyut bir
 * desenle çiziliyordu. Koleksiyonun içindeki ürünlerin gerçek
 * fotoğrafları varken desen göstermek sayfayı yarım bırakıyor;
 * kapak olarak koleksiyonun öne çıkan ürünü kullanılır.
 */
async function getCategoryCovers(): Promise<Map<string, string>> {
  const products = await prisma.product.findMany({
    where: { isActive: true, thumbnailUrl: { not: null } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: { categoryId: true, thumbnailUrl: true },
  });

  const covers = new Map<string, string>();
  for (const p of products) {
    if (p.thumbnailUrl && !covers.has(p.categoryId)) {
      covers.set(p.categoryId, p.thumbnailUrl);
    }
  }
  return covers;
}

async function getCategories(): Promise<HomeCategory[]> {
  try {
    const [categories, covers] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          // Yalnızca aktif ürünler sayılır
          _count: { select: { products: { where: { isActive: true } } } },
        },
      }),
      getCategoryCovers(),
    ]);

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      // Kategorinin kendi görseli varsa o, yoksa içindeki ürün
      imageUrl: resolvePublicImage(c.imageUrl) ?? covers.get(c.id) ?? null,
      productCount: c._count.products,
    }));
  } catch {
    return [];
  }
}

/**
 * Üretim türüne göre gezinme.
 *
 * Kategoriler kullanıma göre ("Ev & Dekorasyon"); ADJY ise üç
 * ayrı şekilde üretiyor. Alıcı bazen "seramik bir şey" diye
 * arıyor, bu yüzden üretim türü kenardaki filtrede saklı
 * kalmamalı — koleksiyonlarla aynı sayfada, görünür olmalı.
 */
async function getMaterialFamilies() {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, materialType: { not: null } },
      select: { materialType: true },
    });

    const counts = new Map<string, number>();
    for (const r of rows) {
      const f = familyFor(r.materialType);
      if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
    }

    return MATERIAL_FAMILIES.filter((f) => (counts.get(f.id) ?? 0) > 0).map((f) => ({
      ...f,
      count: counts.get(f.id) ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function CollectionsPage() {
  const [categories, families] = await Promise.all([
    getCategories(),
    getMaterialFamilies(),
  ]);
  const withProducts = categories.filter((c) => c.productCount > 0);

  return (
    <div className="adjy-container py-14 md:py-20">
      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-5">Koleksiyonlar</p>
        <h1 className="adjy-display text-[clamp(2rem,4.4vw,3.25rem)]">
          Her koleksiyon bir kullanım için.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Masandan duvarına, teknik parçadan hediyeye. Koleksiyonlardaki ürünlerin
          çoğu parametrik — ölçüsünü kendi alanına göre değiştirebilirsin.
        </p>
      </header>

      <div className="mt-12 md:mt-16">
        {withProducts.length > 0 ? (
          <CategoryGrid categories={withProducts} />
        ) : (
          <div className="border border-dashed border-border px-6 py-20 text-center">
            <p className="text-base font-medium">Koleksiyonlar yüklenemedi</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tüm ürünlere göz atarak devam edebilirsiniz.
            </p>
            <Button asChild className="mt-6">
              <Link href="/products">Tüm ürünler</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Boş kategoriler: adı geçsin ama tıklanır bir vaat verilmesin */}
      {categories.length > withProducts.length && (
        <p className="mt-10 text-sm text-muted-foreground">
          Yakında:{" "}
          {categories
            .filter((c) => c.productCount === 0)
            .map((c) => c.name)
            .join(", ")}
        </p>
      )}

      {families.length > 0 && (
        <section className="mt-20 border-t border-border pt-12 md:mt-28">
          <h2 className="text-xl font-medium tracking-tight md:text-2xl">
            Üretim türüne göre
          </h2>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Aynı nesne farklı malzemeyle başka bir şey olur. Dokusunu ve
            ağırlığını seçerek de gezebilirsin.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {families.map((f) => (
              <Link
                key={f.id}
                href={`/products?material=${f.id}`}
                className="group bg-background p-6 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-medium tracking-tight">{f.label}</h3>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {f.count}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                  Göz at
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-20 border-t border-border pt-12 md:mt-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-xl font-medium tracking-tight md:text-2xl">
              Aradığın koleksiyonda değil mi?
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Kendi 3D modelini yükle, üretim teklifini dakikalar içinde al.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/uret">
              Üretim teklifi al
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
