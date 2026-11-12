import type { PrismaClient } from "@/generated/prisma/client";

// ==========================================
// KATEGORİ AĞACI
//
// Mağaza iki katmanlı: ana kategori (kullanım alanı) ve
// onun alt kategorileri. Ürün en özel kategoriye bağlanır
// (ör. "Vazolar"), ana kategori seçildiğinde alt
// kategorilerdeki ürünler de listelenir.
//
// Koleksiyonlar (Hediye, Yılbaşı…) kategori değil, etikettir:
// bir ürün birden çok koleksiyonda olabilir. Etiket slug'ı
// "koleksiyon-" ile başlar.
// ==========================================

export const COLLECTION_PREFIX = "koleksiyon-";

/** Bir kategori slug'ı: kendisi ya da ona bağlı alt kategoriler. */
export function categoryFilter(slug: string) {
  return { OR: [{ slug }, { parent: { slug } }] };
}

/** Koleksiyon (etiket) filtresi. */
export function collectionFilter(slug: string) {
  return { some: { tag: { slug } } };
}

export interface TreeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  /** Kendisi + alt kategorilerindeki aktif ürün sayısı */
  productCount: number;
  /** Kendisi + alt kategorilerinin id'leri (ürün sorguları için) */
  ids: string[];
  children: { id: string; name: string; slug: string; productCount: number }[];
}

const activeProducts = { select: { products: { where: { isActive: true } } } } as const;

/** Aktif ana kategoriler, alt kategorileri ve toplam ürün sayılarıyla. */
export async function loadCategoryTree(prisma: PrismaClient): Promise<TreeCategory[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      sortOrder: true,
      _count: activeProducts,
      children: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, _count: activeProducts },
      },
    },
  });

  return rows.map((c) => {
    const children = c.children.map((k) => ({
      id: k.id,
      name: k.name,
      slug: k.slug,
      productCount: k._count.products,
    }));
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      sortOrder: c.sortOrder,
      productCount: c._count.products + children.reduce((s, k) => s + k.productCount, 0),
      ids: [c.id, ...children.map((k) => k.id)],
      children,
    };
  });
}

export interface CollectionTag {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

/** İçinde aktif ürün olan koleksiyonlar. */
export async function loadCollectionTags(prisma: PrismaClient): Promise<CollectionTag[]> {
  const rows = await prisma.tag.findMany({
    where: { slug: { startsWith: COLLECTION_PREFIX } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { product: { isActive: true } } } } },
    },
  });
  return rows
    .map((t) => ({ id: t.id, name: t.name, slug: t.slug, productCount: t._count.products }))
    .filter((t) => t.productCount > 0);
}
