import { spriteFor } from "./sprites";

// ==========================================
// PİKSEL NESNE — DURAĞAN SVG
//
// Yazıcının bastığı nesnelerin hareketsiz hâli. Sunucuda da
// çizilebilir (canvas gerekmez). Aynı renkte yan yana pikseller
// tek bir dikdörtgende birleştirilir; bir nesne ~40-80 öğe tutar.
// ==========================================

interface Props {
  /** spriteFor anahtarı: "vazo" ya da "tür:slug" */
  spriteKey: string;
  className?: string;
}

export function PixelSprite({ spriteKey, className }: Props) {
  const s = spriteFor(spriteKey);
  const rects: { x: number; y: number; w: number; c: string }[] = [];
  s.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === c) w++;
      rects.push({ x, y, w, c });
      x += w;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${s.w} ${s.h}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1.02} fill={r.c} />
      ))}
    </svg>
  );
}
