import type { MobilyaModeli } from "@/lib/furniture/catalog";

// ==========================================
// ÜRÜN ŞEMASI
//
// Mağaza kartlarında fotoğraf yok, çünkü bu ürünlerin
// fotoğrafı olamaz: her sipariş başka ölçüde. Çekilmiş bir
// fotoğraf koysaydık, müşteri o fotoğraftaki ölçüyü
// beklerdi.
//
// Onun yerine ürünün varsayılan kurulumu çizgiyle çiziliyor.
// Ne olduğu bir bakışta anlaşılıyor, olmayan bir şeyin sözü
// verilmiyor. Oranlar gerçek: 180 santimlik kitaplık kartta da
// uzun, 60 santimlik kutu raf kartta da küçük duruyor.
// ==========================================

const T = 18;

export function ModelSematik({
  model,
  className,
}: {
  model: MobilyaModeli;
  className?: string;
}) {
  const { genislik: W, yukseklik: H, sutun, sira, gozler } = model.varsayilan;

  // Tuvale oturt: en büyük ürün kenara değsin, küçükler
  // gerçek oranında küçük kalsın.
  const tuvalG = 260;
  const tuvalY = 180;
  const olcek = Math.min((tuvalG - 24) / W, (tuvalY - 24) / H, 0.09);
  const g = W * olcek;
  const y = H * olcek;
  const x0 = (tuvalG - g) / 2;
  const y0 = tuvalY - 10 - y;
  const t = Math.max(1.4, T * olcek);

  const icG = g - 2 * t;
  const icY = y - 2 * t;
  const cw = (icG - (sutun - 1) * t) / sutun;
  const rh = (icY - (sira - 1) * t) / sira;

  const dolular: { x: number; y: number; w: number; h: number; tip: string }[] = [];
  for (let c = 0; c < sutun; c++) {
    for (let r = 0; r < sira; r++) {
      const tip = gozler?.[`${c}-${r}`];
      if (!tip) continue;
      dolular.push({
        x: x0 + t + c * (cw + t),
        // SVG'de y yukarıdan başlar; sıra 0 en alttaki göz
        y: y0 + y - t - (r + 1) * rh - r * t,
        w: cw,
        h: rh,
        tip,
      });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${tuvalG} ${tuvalY}`}
      className={className}
      role="img"
      aria-label={`${model.ad} şeması: ${W / 10} × ${H / 10} cm, ${sutun} sütun ${sira} sıra`}
    >
      {/* Gövde */}
      <rect
        x={x0}
        y={y0}
        width={g}
        height={y}
        fill="none"
        stroke="currentColor"
        strokeWidth={t}
        opacity={0.85}
      />
      {/* Dikey bölmeler */}
      {Array.from({ length: sutun - 1 }, (_, i) => (
        <rect
          key={`d${i}`}
          x={x0 + t + (i + 1) * cw + i * t}
          y={y0 + t}
          width={t}
          height={icY}
          fill="currentColor"
          opacity={0.85}
        />
      ))}
      {/* Raflar */}
      {Array.from({ length: sira - 1 }, (_, i) => (
        <rect
          key={`r${i}`}
          x={x0 + t}
          y={y0 + t + (i + 1) * rh + i * t}
          width={icG}
          height={t}
          fill="currentColor"
          opacity={0.85}
        />
      ))}
      {/* Kapaklı ve çekmeceli gözler */}
      {dolular.map((d, i) => (
        <g key={i}>
          <rect
            x={d.x}
            y={d.y}
            width={d.w}
            height={d.h}
            fill="currentColor"
            opacity={0.12}
          />
          <line
            x1={d.tip === "cekmece" ? d.x + d.w * 0.34 : d.x + d.w - 5}
            y1={d.tip === "cekmece" ? d.y + d.h / 2 : d.y + d.h * 0.42}
            x2={d.tip === "cekmece" ? d.x + d.w * 0.66 : d.x + d.w - 5}
            y2={d.tip === "cekmece" ? d.y + d.h / 2 : d.y + d.h * 0.58}
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={0.6}
          />
        </g>
      ))}
    </svg>
  );
}
