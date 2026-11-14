import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getAbsoluteUrl } from "@/lib/url";
import { MODELLER, ODALAR } from "@/lib/furniture/catalog";
import { COLLECTION_PREFIX } from "@/lib/categoryTree";

export const dynamic = "force-dynamic";

const BASE_URL = getAbsoluteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Tüm aktif ürünleri çek
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  // İçinde aktif ürün olan kategoriler (kendisinde ya da alt
  // kategorisinde). Boş kategori sayfası "ince içerik" sayılır
  // ve sitenin genel kalitesini düşürür; bildirilmez.
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      OR: [
        { products: { some: { isActive: true } } },
        { children: { some: { isActive: true, products: { some: { isActive: true } } } } },
      ],
    },
    select: { slug: true, updatedAt: true },
  });

  // Koleksiyonlar (Hediye, Yılbaşı…) de kendi sayfası olan
  // açılışlar; eskiden site haritasında hiç yoktu.
  const collections = await prisma.tag.findMany({
    where: {
      slug: { startsWith: COLLECTION_PREFIX },
      products: { some: { product: { isActive: true } } },
    },
    select: { slug: true },
  });

  // Statik sayfalar
  //
  // Liste elle tutulduğu için yeni bir bölüm eklendiğinde
  // kolayca unutuluyordu: Üret bölümünün tamamı bir süre
  // site haritasının dışında kaldı. Artık yollar öncelikleriyle
  // birlikte tek bir tabloda; yeni sayfa buraya bir satır.
  const ROUTES: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/products", priority: 0.9, changeFrequency: "daily" },
    { path: "/collections", priority: 0.8, changeFrequency: "weekly" },
    
    { path: "/uret", priority: 0.8, changeFrequency: "weekly" },
    { path: "/uret/fotograftan-olustur", priority: 0.8, changeFrequency: "weekly" },
    { path: "/uret/model-yukle", priority: 0.7, changeFrequency: "weekly" },
    { path: "/3d-baski-fiyati-hesapla", priority: 0.6, changeFrequency: "monthly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.4, changeFrequency: "monthly" },
    { path: "/login", priority: 0.3, changeFrequency: "monthly" },
    { path: "/register", priority: 0.3, changeFrequency: "monthly" },
    // Yasal metinler: nadiren değişir ama aranabilir olmalı
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kvkk", priority: 0.3, changeFrequency: "yearly" },
    { path: "/cerez-politikasi", priority: 0.2, changeFrequency: "yearly" },
    { path: "/iade-politikasi", priority: 0.3, changeFrequency: "yearly" },
    { path: "/teslimat-politikasi", priority: 0.3, changeFrequency: "yearly" },
    { path: "/mesafeli-satis-sozlesmesi", priority: 0.2, changeFrequency: "yearly" },
    { path: "/on-bilgilendirme", priority: 0.2, changeFrequency: "yearly" },
  ];

  const staticPages: MetadataRoute.Sitemap = ROUTES.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Kategori sayfaları
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/products?category=${encodeURIComponent(cat.slug)}`,
    lastModified: cat.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const collectionPages: MetadataRoute.Sitemap = collections.map((t) => ({
    url: `${BASE_URL}/products?koleksiyon=${encodeURIComponent(t.slug)}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Ürün sayfaları
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Mobilya sayfaları
  //
  // Bu sayfalar veritabanında ürün satırı olarak durmuyor —
  // mobilya modelleri kodda tanımlı üreteçler. Ürün sorgusundan
  // gelmedikleri için elle eklenmeleri gerekiyor; yoksa on iki
  // yapılandırıcı sayfası arama motorlarına hiç bildirilmez.
  const mobilyaPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/mobilya`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...ODALAR.map((oda) => ({
      url: `${BASE_URL}/mobilya/${oda.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Bir ürün birden çok odada görünüyor; her odanın altındaki
    // adres ayrı bir sayfa, hepsi bildirilmeli.
    ...MODELLER.flatMap((m) =>
      m.odalar.map((oda) => ({
        url: `${BASE_URL}/mobilya/${oda}/${m.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      }))
    ),
  ];

  return [
    ...staticPages,
    ...categoryPages,
    ...collectionPages,
    ...productPages,
    ...mobilyaPages,
  ];
}
