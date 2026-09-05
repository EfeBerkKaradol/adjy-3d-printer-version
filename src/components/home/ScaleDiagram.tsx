// ==========================================
// ÖLÇEK ÇİZİMİ
//
// "Bu nesne benim alanımda ne kadar yer kaplar?"
// sorusunu yanıtlar. Ürünün gerçek ölçü aralığı
// (veritabanındaki min/max) A4 kâğıdın kesin
// ölçüleriyle aynı ölçekte çizilir.
//
// Neden 3D oda değil: GLBModelViewer her modeli
// sabit 3.5 birime normalize ediyor, yani sahnede
// gerçek dünya ölçeği yok. 3D bir oda nesnenin
// büyüklüğünü yanlış gösterirdi. Buradaki çizim
// yalnızca doğrulanabilir sayılara dayanır:
// ürünün kendi mm değerleri ve ISO 216 A4 (210×297 mm).
// ==========================================

interface ScaleDiagramProps {
  /** Ürünün değiştirilebilir genişlik aralığı, mm */
  min: number;
  max: number;
  /** Varsayılan (satın alınan hâli) genişlik, mm */
  current: number;
  label: string;
}

/** Bilinen, kesin ölçülü referanslar (mm) */
const REFERENCES = [
  { mm: 210, label: "A4 kısa kenar" },
  { mm: 297, label: "A4 uzun kenar" },
];

export function ScaleDiagram({ min, max, current, label }: ScaleDiagramProps) {
  // Çizim alanı: en geniş ölçü ya da en büyük referans — hangisi büyükse
  const scaleMax = Math.max(max, ...REFERENCES.map((r) => r.mm)) * 1.08;

  const W = 520; // viewBox genişliği
  const pxPerMm = W / scaleMax;
  const toX = (mm: number) => Math.round(mm * pxPerMm);

  const visibleRefs = REFERENCES.filter((r) => r.mm <= scaleMax);

  // 100 mm'lik cetvel çentikleri
  const ticks: number[] = [];
  for (let mm = 0; mm <= scaleMax; mm += 100) ticks.push(mm);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} 176`}
        className="w-full"
        role="img"
        aria-label={`${label} ${min} ile ${max} milimetre arasında üretilebilir; karşılaştırma için A4 kâğıt aynı ölçekte çizildi.`}
      >
        {/* Cetvel */}
        <g stroke="var(--border)" strokeWidth="1">
          <line x1="0" y1="150" x2={W} y2="150" />
          {ticks.map((mm) => (
            <line key={mm} x1={toX(mm)} y1="150" x2={toX(mm)} y2="156" />
          ))}
        </g>
        {ticks
          .filter((mm) => mm % 200 === 0)
          .map((mm) => (
            <text
              key={mm}
              x={toX(mm)}
              y="170"
              textAnchor={mm === 0 ? "start" : "middle"}
              fontSize="10"
              fill="var(--muted-foreground)"
              fontFamily="var(--font-geist-mono), monospace"
            >
              {mm / 10} cm
            </text>
          ))}

        {/* Referanslar — soluk, arkada */}
        {visibleRefs.map((ref, i) => (
          <g key={ref.mm}>
            <rect
              x="0"
              y={22 + i * 22}
              width={toX(ref.mm)}
              height="14"
              fill="var(--muted)"
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={toX(ref.mm) + 8}
              y={33 + i * 22}
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              {ref.label} · {ref.mm} mm
            </text>
          </g>
        ))}

        {/* Ürünün en dar hâli — kesikli */}
        <rect
          x="0"
          y="82"
          width={toX(min)}
          height="20"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={toX(min) + 8}
          y="96"
          fontSize="10"
          fill="var(--muted-foreground)"
          fontFamily="var(--font-geist-mono), monospace"
        >
          en dar · {min} mm
        </text>

        {/* Ürünün en geniş hâli — dolu */}
        <rect x="0" y="110" width={toX(max)} height="20" fill="var(--foreground)" />
        <text
          x={toX(max) + 8}
          y="124"
          fontSize="10"
          fill="var(--muted-foreground)"
          fontFamily="var(--font-geist-mono), monospace"
        >
          en geniş · {max} mm
        </text>

        {/* Varsayılan ölçü işareti */}
        {current > min && current < max && (
          <g>
            <line
              x1={toX(current)}
              y1="76"
              x2={toX(current)}
              y2="136"
              stroke="var(--brand-violet)"
              strokeWidth="1.5"
            />
            <text
              x={toX(current)}
              y="70"
              textAnchor="middle"
              fontSize="10"
              fill="var(--brand-violet)"
              fontFamily="var(--font-geist-mono), monospace"
            >
              varsayılan {current} mm
            </text>
          </g>
        )}
      </svg>

      <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Çizim gerçek oranlarda. A4 kâğıt ({REFERENCES[0].mm}×{REFERENCES[1].mm} mm)
        karşılaştırma için aynı ölçekte gösterildi.
      </figcaption>
    </figure>
  );
}
