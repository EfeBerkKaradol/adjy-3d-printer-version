import Link from "next/link";
import { PixelArrow } from "@/components/home/PixelMoreButton";
import { YILBASI, YILBASI_KOLEKSIYON_ADRESI } from "@/lib/yilbasi";
import { Isiltilar } from "./Isiltilar";

// ==========================================
// MAĞAZA — YILBAŞI BANDI
//
// Mağaza, Üret ve Kendin Tasarla sayfalarının başında, yılbaşı
// döneminde duran ince çam yeşili bant: koleksiyona giden yol ve
// yılbaşına teslim için son sipariş günü. Ana sayfadaki vitrinin
// kısa hâli; her sayfada aynı sezon havası.
// ==========================================

export function YilbasiBandi({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Yılbaşı koleksiyonu"
      className={`relative overflow-hidden bg-[var(--yilbasi)] text-[var(--yilbasi-on)] ${className}`}
    >
      <Isiltilar />
      <div className="relative z-10 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-lg font-semibold leading-tight tracking-[-0.01em] sm:text-xl">
            Yılbaşı koleksiyonu atölyeden çıktı.
          </p>
          <p className="mt-1 text-sm">
            Yılbaşından önce teslim için son sipariş: {YILBASI.sonSiparisYazi}
          </p>
        </div>
        <Link
          href={YILBASI_KOLEKSIYON_ADRESI}
          className="group inline-flex shrink-0 items-center gap-3 self-start bg-[var(--yilbasi-on)] px-5 py-3 text-sm font-semibold text-[var(--yilbasi)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--yilbasi-on)] active:translate-y-0 sm:self-auto"
        >
          Koleksiyona bak
          <PixelArrow className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </aside>
  );
}
