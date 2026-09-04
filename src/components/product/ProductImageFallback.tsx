// ==========================================
// GÖRSEL YOKSA
// Ürün fotoğrafı bulunmayan kayıtlar için sessiz,
// slug'dan türetilen geometrik zemin. Marka dışı
// renkli degradeler ve gerçeğe benzemeyen ikonlar
// yerine nötr bir yer tutucu kullanılır.
// ==========================================

interface ProductImageFallbackProps {
  slug: string;
  className?: string;
}

export function ProductImageFallback({ slug, className }: ProductImageFallbackProps) {
  const seed = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rotation = seed % 45;
  const cells = 4 + (seed % 3);
  const step = 72 / cells;

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-surface-2 ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-1/2 w-1/2 text-muted-foreground/35"
        aria-hidden="true"
      >
        <g
          transform={`rotate(${rotation} 60 60)`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="24" y="24" width="72" height="72" />
          {Array.from({ length: cells - 1 }).map((_, i) => {
            const pos = 24 + step * (i + 1);
            return (
              <g key={i}>
                <line x1={pos} y1="24" x2={pos} y2="96" strokeOpacity="0.5" />
                <line x1="24" y1={pos} x2="96" y2={pos} strokeOpacity="0.5" />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
