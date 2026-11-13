import Link from "next/link";

// ==========================================
// "DAHA FAZLASINI GÖR" — PİKSEL DÜĞME
// Ana sayfadaki kısaltılmış bölümlerin (kategoriler, ürün rafları)
// altında durur; bölümün tam listesine gider.
// ==========================================

export function PixelArrow({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 7" className={className} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      <rect x="0" y="3" width="5" height="1" />
      <rect x="3" y="1" width="1" height="1" />
      <rect x="4" y="2" width="1" height="1" />
      <rect x="5" y="3" width="1" height="1" />
      <rect x="4" y="4" width="1" height="1" />
      <rect x="3" y="5" width="1" height="1" />
    </svg>
  );
}

export function PixelMoreButton({ href, count }: { href: string; count?: number }) {
  return (
    <div className="mt-10 flex justify-center">
      <Link
        href={href}
        className="adjy-pixel-card inline-flex items-center gap-3 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em]"
      >
        Daha fazlasını gör
        {count !== undefined && <span className="text-muted-foreground">({count})</span>}
        <PixelArrow />
      </Link>
    </div>
  );
}
