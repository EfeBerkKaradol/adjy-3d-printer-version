import { Reveal } from "./Reveal";

// ==========================================
// DİJİTALDEN FİZİKSELE
//
// ADJY'nin üretim hattını dört karede anlatır.
// Uzun paragraf yerine görsel dizi: her adım
// nesnenin o andaki hâlini çizer — tel kafes,
// ölçülendirilmiş, katman katman basılan, katı nesne.
//
// Jenerik "Neden ADJY?" kart listesinin yerini alır:
// özellikleri saymak yerine süreci gösterir.
// ==========================================

const STAGES = [
  {
    title: "Dijital nesne",
    body: "Her ürün bir dosya olarak başlar. Rafta beklemez.",
  },
  {
    title: "Yapılandırma",
    body: "Ölçüyü, malzemeyi ve rengi sen belirlersin.",
  },
  {
    title: "Üretim",
    body: "Senin konfigürasyonun katman katman basılır.",
  },
  {
    title: "Fiziksel nesne",
    body: "Kontrolden geçer, paketlenir, sana gelir.",
  },
];

/** Nesnenin her aşamadaki hâli — tek bir kutu, dört farklı durum */
function StageGlyph({ index }: { index: number }) {
  const stroke = "currentColor";

  return (
    <svg viewBox="0 0 100 80" className="h-20 w-full text-foreground" aria-hidden="true">
      {/* 01 — tel kafes */}
      {index === 0 && (
        <g fill="none" stroke={stroke} strokeWidth="1" opacity="0.75">
          <path d="M22 30l28-12 28 12-28 12z" />
          <path d="M22 30v22l28 12V42z" />
          <path d="M78 30v22L50 64V42z" />
          <path d="M22 30l56 22M78 30L22 52" strokeDasharray="3 3" opacity="0.4" />
        </g>
      )}

      {/* 02 — ölçülendirilmiş */}
      {index === 1 && (
        <g fill="none" stroke={stroke} strokeWidth="1">
          <path d="M28 32h44v28H28z" opacity="0.75" />
          <g stroke="var(--brand-violet)">
            <path d="M28 22h44M28 18v8M72 18v8" />
            <path d="M80 32v28M76 32h8M76 60h8" />
          </g>
        </g>
      )}

      {/* 03 — katman katman */}
      {index === 2 && (
        <g stroke={stroke} strokeWidth="1" fill="none">
          <path d="M28 60h44" />
          {Array.from({ length: 7 }).map((_, i) => (
            <path
              key={i}
              d={`M${30 + i * 0.8} ${57 - i * 4}h${40 - i * 1.6}`}
              opacity={i > 4 ? 0.35 : 0.8}
            />
          ))}
          <path d="M50 20v6" stroke="var(--brand-violet)" strokeWidth="1.5" />
          <path d="M44 14h12v6H44z" fill="none" stroke="var(--brand-violet)" />
        </g>
      )}

      {/* 04 — katı nesne */}
      {index === 3 && (
        <g>
          <path d="M22 30l28-12 28 12-28 12z" fill={stroke} opacity="0.9" />
          <path d="M22 30v22l28 12V42z" fill={stroke} opacity="0.62" />
          <path d="M78 30v22L50 64V42z" fill={stroke} opacity="0.42" />
          <ellipse cx="50" cy="70" rx="26" ry="3" fill={stroke} opacity="0.12" />
        </g>
      )}
    </svg>
  );
}

export function DigitalToPhysical() {
  return (
    <section
      className="border-y border-border bg-surface"
      aria-label="Dijitalden fiziksele"
    >
      <div className="adjy-container adjy-section">
        <Reveal className="max-w-2xl">
          <p className="adjy-eyebrow mb-5">Süreç</p>
          <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
            Dijitalden fiziksele.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Bir ADJY nesnesi dosya olarak doğar, senin ölçünle şekillenir ve
            ancak sipariş verdiğinde fiziksel hâle gelir.
          </p>
        </Reveal>

        <ol className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-4 md:mt-20">
          {STAGES.map((stage, i) => (
            <Reveal
              as="li"
              key={stage.title}
              index={i}
              className="border-t border-border pt-8"
            >
              <div className="pr-6">
                <StageGlyph index={i} />
                <span className="mt-6 block font-mono text-xs tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-medium tracking-tight">{stage.title}</h3>
                <p className="mt-2 pb-8 text-sm leading-relaxed text-muted-foreground">
                  {stage.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>

      </div>
    </section>
  );
}
