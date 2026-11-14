import Link from "next/link";
import { PixelArrow, PixelTag } from "@/components/home/PixelMoreButton";

// ==========================================
// YASAL BELGE SAYFASI — PİKSEL DÜZEN
//
// KVKK, gizlilik, çerez, iade, teslimat, mesafeli satış,
// ön bilgilendirme ve kullanım şartları aynı iskeleti paylaşır:
//
//   üst etiket · başlık · açıklama · güncelleme etiketi
//   solda (masaüstünde yapışkan) belge listesi
//   sağda bölümler: mono numara, kesikli ayraç, kare madde imi
//
// Bölüm numaraları CSS sayacıyla verilir (globals.css → .adjy-legal);
// sayfalardaki <h2> başlıklarına elle numara yazılmaz.
// ==========================================

export const LEGAL_DOCS = [
  { href: "/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/on-bilgilendirme", label: "Ön Bilgilendirme Formu" },
  { href: "/iade-politikasi", label: "İade ve İptal" },
  { href: "/teslimat-politikasi", label: "Teslimat" },
  { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
  { href: "/privacy", label: "Gizlilik Politikası" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/terms", label: "Kullanım Şartları" },
] as const;

export type LegalHref = (typeof LEGAL_DOCS)[number]["href"];

interface LegalPageProps {
  /** Bu sayfanın adresi: soldaki listede işaretlenir */
  current: LegalHref;
  title: string;
  /** Başlığın altındaki kısa açıklama (kanun dayanağı vb.) */
  intro?: React.ReactNode;
  /** "Mayıs 2026" gibi; etiket olarak gösterilir */
  updated?: string;
  /** Bölüm numarasının önüne eklenen kelime: "Madde" → "MADDE 01" */
  sectionLabel?: string;
  children: React.ReactNode;
}

export function LegalPage({ current, title, intro, updated, sectionLabel, children }: LegalPageProps) {
  return (
    <div className="adjy-container py-14 md:py-20">
      <header className="max-w-3xl">
        <p className="adjy-eyebrow mb-5">Yasal</p>
        <h1 className="adjy-display text-[clamp(1.9rem,4.2vw,3rem)]">{title}</h1>
        {intro && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">{intro}</p>
        )}
        {updated && (
          <div className="mt-6">
            <PixelTag>Son güncelleme · {updated}</PixelTag>
          </div>
        )}
      </header>

      <div className="mt-12 grid gap-10 border-t-2 border-dashed border-foreground/25 pt-10 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-16">
        {/* Telefonda liste metnin altına iner: önce belge okunur */}
        <nav
          aria-label="Yasal belgeler"
          className="order-2 border-t-2 border-dashed border-foreground/25 pt-10 lg:order-1 lg:sticky lg:top-24 lg:self-start lg:border-0 lg:pt-0"
        >
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Belgeler
          </p>
          <ul className="adjy-pixel-card divide-y-2 divide-dashed divide-foreground/20">
            {LEGAL_DOCS.map((d) => {
              const aktif = d.href === current;
              return (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    aria-current={aktif ? "page" : undefined}
                    className={
                      "flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors " +
                      (aktif
                        ? "bg-foreground font-medium text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground")
                    }
                  >
                    {d.label}
                    {aktif && <PixelArrow className="h-3 w-3 shrink-0" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <article
          className="adjy-legal order-1 max-w-3xl lg:order-2"
          style={sectionLabel ? ({ "--legal-label": `"${sectionLabel} "` } as React.CSSProperties) : undefined}
        >
          {children}
        </article>
      </div>
    </div>
  );
}

/** Öne çıkan uyarı kutusu: cayma hakkı istisnası gibi */
export function LegalNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="adjy-pixel-card mt-4 flex gap-3 p-4">
      <span className="adjy-pixel-box h-fit shrink-0 bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-bold text-background">
        !
      </span>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
