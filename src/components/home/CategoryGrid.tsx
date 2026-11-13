import Link from "next/link";
import { PixelSprite } from "@/components/home/printer/PixelSprite";
import { kindForCategory } from "@/components/home/printer/sprites";
import { PixelArrow, PixelMoreButton } from "@/components/home/PixelMoreButton";

// ==========================================
// KATEGORİLER — PİKSEL VİTRİN
//
// Karşılamadaki yazıcının dilini sürdürür: her kategori, yazıcının
// bastığı türden bir piksel nesneyle temsil edilir. Kartlar
// basamaklı köşeli piksel çerçeveli; üzerine gelince kart sert
// gölgesiyle yukarı kalkar ve nesne alttan yukarı "yeniden basılır".
//
// Kategori görselleri bilinçli olarak kullanılmıyor: fotoğraf ile
// piksel nesneyi karıştırmak temayı dağıtıyordu.
// ==========================================

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

/** Ana kategoriler için elle seçilmiş nesneler; diğerleri türünden */
const KATEGORI_NESNESI: Record<string, string> = {
  aydinlatma: "mantar",
  "vazo-saksi": "saksi",
  "ev-dekorasyon": "kedi",
  "ofis-aksesuarlari": "duzenleyici:ofis-aksesuarlari",
  "duzen-depolama": "raf:duzen-depolama",
  "hobi-boyama": "figur:hobi-boyama-2",
  "mimari-maket": "maket:mimari-maket",
  mobilya: "mobilya:mobilya-1",
};

function nesneOf(slug: string) {
  return KATEGORI_NESNESI[slug] ?? `${kindForCategory([slug])}:${slug}`;
}

interface Props {
  categories: HomeCategory[];
  /**
   * Gösterilecek en fazla kart. Ana sayfada 4: masaüstünde tek sıra,
   * telefonda 2×2. Verilirse altına "Daha fazlasını gör" düğmesi
   * eklenir ve tüm kategoriler sayfasına gider.
   */
  limit?: number;
}

export function CategoryGrid({ categories, limit }: Props) {
  if (categories.length === 0) return null;
  const gosterilen = limit ? categories.slice(0, limit) : categories;

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {gosterilen.map((c, i) => (
          <li key={c.id}>
            <Link
              href={`/products?category=${c.slug}`}
              className="adjy-pixel-card group flex h-full flex-col"
            >
              {/* Sahne: noktalı ızgara üstünde piksel nesne */}
              <div className="relative flex aspect-[5/4] items-end justify-center overflow-hidden px-4 pb-3 pt-6 [background-image:radial-gradient(color-mix(in_oklab,var(--foreground)_16%,transparent)_1px,transparent_1.5px)] [background-size:10px_10px]">
                <span className="absolute left-2.5 top-2 font-mono text-[10px] tabular-nums tracking-[0.12em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <PixelSprite
                  spriteKey={nesneOf(c.slug)}
                  className="adjy-print-reveal h-[78%] w-auto max-w-full"
                />
              </div>

              {/* Alt şerit */}
              <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-foreground/80 px-3.5 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold leading-tight">
                    {c.name}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {c.productCount} ürün
                  </p>
                </div>
  <PixelArrow className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {limit && <PixelMoreButton href="/collections" count={categories.length} />}
    </>
  );
}
