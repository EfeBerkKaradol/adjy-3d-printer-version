import type { CardBrand } from "@/lib/card";
import { PixelText } from "./PixelText";

// ==========================================
// PİKSEL MARKA İŞARETLERİ
// Kart birliklerinin logoları değil, sitenin piksel diliyle
// çizilmiş sade işaretler: marka adı + birliğin renkleri.
// ==========================================

function circles(): { d1: string; d2: string; mid: string } {
  // İki kesişen piksel daire (16×10 ızgara)
  let d1 = "";
  let d2 = "";
  let mid = "";
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 16; x++) {
      const inA = (x - 4.5) ** 2 + (y - 4.5) ** 2 <= 22;
      const inB = (x - 10.5) ** 2 + (y - 4.5) ** 2 <= 22;
      const px = `M${x} ${y}h1v1h-1z`;
      if (inA && inB) mid += px;
      else if (inA) d1 += px;
      else if (inB) d2 += px;
    }
  }
  return { d1, d2, mid };
}
const MC = circles();

export function BrandMark({
  brand,
  size = "2px",
  className,
}: {
  brand: CardBrand;
  size?: string;
  className?: string;
}) {
  if (brand === "mastercard") {
    return (
      <svg
        viewBox="0 0 16 10"
        shapeRendering="crispEdges"
        className={className}
        style={{ width: `calc(${size} * 16)`, height: `calc(${size} * 10)` }}
        aria-label="Mastercard"
      >
        <path d={MC.d1} fill="#eb001b" />
        <path d={MC.d2} fill="#f79e1b" />
        <path d={MC.mid} fill="#ff5f00" />
      </svg>
    );
  }

  if (brand === "amex") {
    return (
      <span
        className={className}
        aria-label="American Express"
        style={{
          background: "#1f72cd",
          color: "#fff",
          padding: `calc(${size} * 1.5)`,
          display: "inline-flex",
          lineHeight: 0,
        }}
      >
        <PixelText text="AMEX" size={size} />
      </span>
    );
  }

  if (brand === "troy") {
    return (
      <span
        className={className}
        aria-label="Troy"
        style={{ color: "#fff", display: "inline-flex", alignItems: "end", gap: size, lineHeight: 0 }}
      >
        <PixelText text="TROY" size={size} />
        <span
          style={{
            width: `calc(${size} * 2)`,
            height: `calc(${size} * 2)`,
            background: "#00c2c7",
          }}
        />
      </span>
    );
  }

  if (brand === "visa") {
    return (
      <span
        className={className}
        aria-label="Visa"
        style={{ color: "#fff", display: "inline-flex", flexDirection: "column", gap: size, lineHeight: 0 }}
      >
        <PixelText text="VISA" size={size} />
        <span style={{ height: size, background: "#f7b600" }} />
      </span>
    );
  }

  return null;
}
