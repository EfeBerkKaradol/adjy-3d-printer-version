import Link from "next/link";
import { ProductRail, type RailProduct } from "@/components/product/ProductRail";
import { PixelArrow } from "@/components/home/PixelMoreButton";
import { YILBASI_KOLEKSIYON_ADRESI } from "@/lib/yilbasi";
import { GeriSayim } from "./GeriSayim";
import { PikselKar } from "./PikselKar";

// ==========================================
// ANA SAYFA — YILBAŞI VİTRİNİ
//
// Yılbaşı döneminde karşılamanın hemen altında, bütün genişlikte
// çam yeşili bir alan: koleksiyonun gerçek ürünleri ve "yılbaşına
// yetişir mi?" sorusunun canlı cevabı. Alanın arkasında da
// karşılamadaki gibi piksel kar yağar.
//
// Ürünler mağazadaki yılbaşı koleksiyonu etiketinden gelir;
// koleksiyon boşsa bölüm hiç gösterilmez.
// ==========================================

export function YilbasiVitrini({ urunler }: { urunler: RailProduct[] }) {
  return (
    <section
      id="yilbasi"
      aria-labelledby="yilbasi-baslik"
      className="adjy-yilbasi relative overflow-hidden bg-[var(--yilbasi)] text-[var(--yilbasi-on)]"
    >
      <PikselKar />
      <div className="adjy-container relative z-10 py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
          <div className="max-w-xl">
            <h2
              id="yilbasi-baslik"
              className="adjy-display text-[clamp(2.2rem,5.4vw,4.4rem)] leading-[0.98]"
            >
              Yılbaşı atölyeden çıkıyor.
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed">
              Fındıkkıran asker, ışıklı minyatür evler, masaüstü yılbaşı
              ağacı, ağaç tepesine fiyonk ve isme özel süs setleri. Hepsi
              kendi atölyemizde, siparişinize göre basılıyor.
            </p>
            <Link
              href={YILBASI_KOLEKSIYON_ADRESI}
              className="group mt-8 inline-flex items-center gap-3 bg-[var(--yilbasi-on)] px-6 py-3.5 text-sm font-semibold text-[var(--yilbasi)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--yilbasi-on)] active:translate-y-0"
            >
              Yılbaşı koleksiyonu
              <PixelArrow className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <GeriSayim />
        </div>

        <div className="adjy-yilbasi-raf mt-14">
          <ProductRail products={urunler} moreHref={YILBASI_KOLEKSIYON_ADRESI} />
        </div>
      </div>
    </section>
  );
}
