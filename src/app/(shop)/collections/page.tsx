import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CategoryGrid, type HomeCategory } from "@/components/home/CategoryGrid";
import { Button } from "@/components/ui/button";
import { resolvePublicImage } from "@/lib/publicAsset";
import { ArrowRight } from "lucide-react";

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

async function getCategories(): Promise<HomeCategory[]> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        _count: { select: { products: true } },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: resolvePublicImage(c.imageUrl),
      productCount: c._count.products,
    }));
  } catch {
    return [];
  }
}

export default async function CollectionsPage() {
  const categories = await getCategories();
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
            <Link href="/3d-baski-fiyati-hesapla">
              Üretim teklifi al
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
