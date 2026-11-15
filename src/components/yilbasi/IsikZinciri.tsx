import { Fragment, useId } from "react";
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
//
// Hafif tutmak için bütün zincir TEK bir SVG: her rengin sönük ve
// yanık hâli <defs> içinde bir kez çizilir, ampuller bunları <use>
// ile yineler. Yanıp sönen şey ampulün pikselleri değil, aynı anda
// yanan ampullerin "yanık" katmanını taşıyan grup — zincir başına
// 28 animasyon. Eskiden her piksel ayrı bir <rect> ve ayrı bir
// animasyondu: sayfa başına ~5.900 düğüm, ~4.350 animasyon.
// ==========================================

const RENKLER = ["#E0313B", "#F2B632", "#3FAE5A", "#7EC8E3"] as const;
const ADET = 64;

// Yerleşim (px): 20'lik ampul + 40 boşluk, soldan 18 içeride
const ADIM = 60;
const SOL = 18;
const GENISLIK = SOL + ADET * ADIM - 40;
const YUKSEKLIK = 40;
// Çizim birimi bir ampul pikseli: 20 px'lik ampul 12 birimdi → 1 birim = 5/3 px
const PX = 3 / 5;

// Ampulün piksel haritası (K: duy · G: cam · W: parlama), askı
// noktası (duyun üst ortası) x=0 olacak biçimde tek parça yollar:
//   .KKKK.
//   .KKKK.
//   .GGGG.
//   GWGGGG
//   GGGGGG
//   GGGGGG
//   GGGGGG
//   .GGGG.
//   ..GG..
const DUY = "M-2 1h4v2h-4z";
const CAM = "M-2 3h4v1h1v4h-1v1h-1v1h-2v-1h-1v-1h-1v-4h1z";
const PARLAMA = "M-2 4h1v1h-1z";
// Hale: yanınca camın etrafında açık renkli piksel artı
const HALE = "M-3 2h6v2h2v4h-2v3h-6v-3h-2v-4h2z";

// Gecikme i%4 ve i%7'ye bağlı → 28 ampulde bir yinelenir; aynı
// gecikmeyi paylaşan ampuller tek grupta, tek animasyonla yanar.
const FAZ = 28;

const AMPULLER = Array.from({ length: ADET }, (_, i) => {
  // Kablodan sarkma ve hafif eğim: zincir cetvelle çizilmiş durmasın
  const x = ((SOL + 10 + i * ADIM) * 3) / 5;
  const y = (i % 2 ? 5 : 2) * PX;
  const egim = i % 3 === 0 ? -9 : i % 3 === 1 ? 7 : -2;
  return { i, renk: i % RENKLER.length, donusum: `translate(${x} ${y})rotate(${egim})` };
});

const FAZLAR = Array.from({ length: FAZ }, (_, k) => ({
  k,
  gecikme: `${((k % 4) * 45 + (k % 7) * 7) / 100}s`,
  ampuller: AMPULLER.filter((a) => a.i % FAZ === k),
}));

export function IsikZinciri({ className, ters = false }: { className?: string; ters?: boolean }) {
  // Zincir sayfada iki kez çizilir (üst şerit + altbilgi): kimlikler çakışmasın
  const kimlik = useId();

  return (
    <div
      aria-hidden
      className={cn("adjy-zincir pointer-events-none relative h-[40px] overflow-hidden", ters && "rotate-180", className)}
    >
      {/* Kablo */}
      <span className="absolute inset-x-0 top-[3px] h-[2px] bg-[#2A2A2A] dark:bg-[#9A9A96]" />
      <svg
        width={GENISLIK}
        height={YUKSEKLIK}
        viewBox={`0 0 ${(GENISLIK * 3) / 5} ${YUKSEKLIK * PX}`}
        shapeRendering="crispEdges"
        className="relative block max-w-none"
      >
        <defs>
          {RENKLER.map((renk, r) => (
            <Fragment key={renk}>
              {/* Sönük ampul: cam soluk, duy ve parlama yerinde */}
              <g id={`${kimlik}s${r}`}>
                <path d={CAM} fill={renk} opacity={0.35} />
                <path d={DUY} fill="#2A2A2A" />
                <path d={PARLAMA} fill="#FFFFFF" />
              </g>
              {/* Yanık ampul: sönüğün tam üstüne oturur; hale duyun
                  ve parlamanın arkasında kalsın diye onlar yeniden çizilir */}
              <g id={`${kimlik}y${r}`}>
                <path d={HALE} fill={renk} className="adjy-ampul-hale" />
                <path d={CAM} fill={renk} />
                <path d={DUY} fill="#2A2A2A" />
                <path d={PARLAMA} fill="#FFFFFF" />
              </g>
            </Fragment>
          ))}
        </defs>

        {AMPULLER.map((a) => (
          <use key={a.i} href={`#${kimlik}s${a.renk}`} transform={a.donusum} />
        ))}

        {FAZLAR.map((f) => (
          <g key={f.k} className="adjy-ampul-isik" style={{ animationDelay: f.gecikme }}>
            {f.ampuller.map((a) => (
              <use key={a.i} href={`#${kimlik}y${a.renk}`} transform={a.donusum} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
