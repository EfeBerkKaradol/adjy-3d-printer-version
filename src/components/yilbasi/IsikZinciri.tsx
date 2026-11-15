import { cn } from "@/lib/utils";

// ==========================================
// PİKSEL IŞIK ZİNCİRİ
//
// Yılbaşı döneminde üst şeridin altında ve altbilginin üstünde,
// sayfa boyunca uzanan piksel ampuller. Dört renk sırayla yanıp
// söner; her ampulün arkasında piksel bir hale yanar.
//
// Saf CSS: betik gerekmez, sunucuda çizilir. Ampuller sabit
// aralıkla dizilir, dar ekranda fazlası taşmadan kesilir.
// Hareket azaltma açıksa hepsi sabit yanar (globals.css).
// ==========================================

const RENKLER = ["#E0313B", "#F2B632", "#3FAE5A", "#7EC8E3"] as const;
const ADET = 64;

// K: duy · G: cam · W: parlama
const AMPUL = [
  ".KKKK.",
  ".KKKK.",
  ".GGGG.",
  "GWGGGG",
  "GGGGGG",
  "GGGGGG",
  "GGGGGG",
  ".GGGG.",
  "..GG..",
];

function Ampul({ renk }: { renk: string }) {
  return (
    <svg viewBox="-3 -1 12 12" shapeRendering="crispEdges" className="adjy-ampul" aria-hidden>
      {/* Hale: yanınca camın etrafında açık renkli piksel artı */}
      <g className="adjy-ampul-hale" fill={renk}>
        <rect x={-2} y={3} width={10} height={4} />
        <rect x={0} y={1} width={6} height={9} />
      </g>
      {AMPUL.flatMap((satir, y) =>
        [...satir].map((c, x) => {
          if (c === ".") return null;
          const fill = c === "K" ? "#2A2A2A" : c === "W" ? "#FFFFFF" : renk;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fill}
              className={c === "G" ? "adjy-ampul-cam" : undefined}
            />
          );
        })
      )}
    </svg>
  );
}

export function IsikZinciri({ className, ters = false }: { className?: string; ters?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn("adjy-zincir pointer-events-none relative h-[40px] overflow-hidden", ters && "rotate-180", className)}
    >
      {/* Kablo */}
      <span className="absolute inset-x-0 top-[3px] h-[2px] bg-[#2A2A2A] dark:bg-[#9A9A96]" />
      <div className="relative flex gap-[40px] pl-[18px]">
        {Array.from({ length: ADET }, (_, i) => (
          <span
            key={i}
            className="adjy-zincir-halka block w-[20px] shrink-0"
            style={
              {
                "--gecikme": `${(i % 4) * 0.45 + (i % 7) * 0.07}s`,
                "--sarkma": i % 2 ? "5px" : "2px",
                "--egim": i % 3 === 0 ? "-9deg" : i % 3 === 1 ? "7deg" : "-2deg",
              } as React.CSSProperties
            }
          >
            <Ampul renk={RENKLER[i % RENKLER.length]} />
          </span>
        ))}
      </div>
    </div>
  );
}
