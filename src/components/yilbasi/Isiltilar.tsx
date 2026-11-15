// ==========================================
// IŞILTILAR
//
// Yeşil yılbaşı alanlarının (ana sayfa vitrini, mağaza bandı,
// altbilgi) üstüne serpilmiş, sırayla parlayıp sönen altın piksel
// yıldızlar. Yerleri sabit (sunucu ile tarayıcı aynı çizer),
// tıklamayı engellemez, yazının arkasında kalır.
// Hareket azaltma açıksa sabit, yarı parlak durur.
// ==========================================

// [sol %, üst %, boy px, gecikme s]
const YILDIZLAR: [number, number, number, number][] = [
  [4, 18, 10, 0], [13, 72, 6, 1.1], [22, 34, 8, 2.3], [31, 86, 6, 0.6],
  [38, 12, 6, 1.8], [47, 58, 10, 0.9], [55, 24, 6, 2.7], [63, 80, 8, 0.3],
  [71, 42, 6, 1.5], [79, 14, 10, 2.1], [86, 66, 6, 0.8], [93, 30, 8, 1.3],
  [97, 88, 6, 2.5], [8, 50, 6, 1.9], [59, 92, 6, 1.2], [42, 40, 6, 3.1],
];

function Yildiz() {
  return (
    <svg viewBox="0 0 5 5" shapeRendering="crispEdges" className="h-full w-full">
      <rect x={2} y={0} width={1} height={5} fill="var(--yilbasi-altin)" />
      <rect x={0} y={2} width={5} height={1} fill="var(--yilbasi-altin)" />
      <rect x={2} y={2} width={1} height={1} fill="#FFF6D6" />
    </svg>
  );
}

export function Isiltilar({ yogun = false }: { yogun?: boolean }) {
  const liste = yogun ? YILDIZLAR : YILDIZLAR.filter((_, i) => i % 2 === 0);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {liste.map(([x, y, boy, gecikme], i) => (
        <span
          key={i}
          className="adjy-isilti absolute block"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: boy,
            height: boy,
            animationDelay: `${gecikme}s`,
          }}
        >
          <Yildiz />
        </span>
      ))}
    </div>
  );
}
