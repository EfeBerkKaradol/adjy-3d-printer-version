import { cn } from "@/lib/utils";

// ==========================================
// ADJY LOGOSU
//
// Orbitron yazı + altında ince bir parametre kaydırıcısı.
// Fikir sitenin kendi ölçü kaydırıcısından geliyor
// (configure/ParameterSlider): "ölçüsünü sen ayarla".
//
// Kaydırıcı yazının genişliğine oturan bir SVG; logo
// font-size ile birlikte büyür, renk currentColor'dan gelir
// ve koyu temada kendiliğinden döner. Ayrı görsel dosyası yok.
//
// Topuz J ile Y'nin arasında durur; logonun bağlı olduğu
// bağlantının üzerine gelince biraz ileri kayar.
// ==========================================

interface LogoProps {
  className?: string;
  /** Alttaki kaydırıcı. Çok küçük kullanımlarda kapatılabilir. */
  slider?: boolean;
}

export function Logo({ className, slider = true }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-col font-[family-name:var(--font-orbitron)] font-extrabold leading-none tracking-[0.22em]",
        className
      )}
    >
      {/* Son harften sonraki harf aralığını geri al: ray tam Y'de bitsin */}
      <span className="-mr-[0.22em]">ADJY</span>

      {slider && (
        // SVG: sitenin piksel katmanı her yerde border-radius'u sıfırlar,
        // daire ve yuvarlak uçlar ondan etkilenmesin diye div değil SVG.
        // viewBox genişliği yazının genişliğiyle aynı oranda (386 birim).
        <svg
          aria-hidden
          viewBox="0 0 386 34"
          className="mt-[0.2em] block h-auto w-0 min-w-full overflow-visible"
        >
          <line x1="2" y1="17" x2="384" y2="17" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} strokeLinecap="round" />
          <line
            x1="2"
            y1="17"
            x2="291"
            y2="17"
            stroke="currentColor"
            strokeWidth={5}
            strokeLinecap="round"
            className="origin-left transition-transform duration-300 ease-out [transform-box:fill-box] motion-safe:group-hover/logo:scale-x-[1.19]"
          />
          <circle
            cx="291"
            cy="17"
            r="10"
            fill="currentColor"
            className="transition-transform duration-300 ease-out motion-safe:group-hover/logo:translate-x-[56px]"
          />
        </svg>
      )}
    </span>
  );
}
