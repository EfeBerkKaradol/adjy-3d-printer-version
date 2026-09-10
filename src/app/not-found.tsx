import Link from "next/link";
import { ArrowRight } from "lucide-react";

// ==========================================
// 404
//
// Sayfanın kendisi bir çıkmaz sokak; en azından çıkışları
// göstersin. Tek bir "geri dön" butonu yerine kullanıcının
// gerçekten arıyor olabileceği dört yol veriliyor.
//
// Dil ve tipografi sitenin geri kalanıyla aynı: sola
// hizalı editoryal düzen, "sen" hitabı, ölçülü başlık.
// ==========================================

const EXITS = [
  { label: "Mağaza", href: "/products", description: "Üretime hazır ADJY nesneleri" },
  { label: "Koleksiyonlar", href: "/collections", description: "Kullanıma göre keşfet" },
  { label: "Yapılandır", href: "/configure", description: "Nesneyi kendi ölçünde ürettir" },
  { label: "Üret", href: "/uret", description: "Fotoğraftan ya da kendi modelinden" },
];

export default function NotFound() {
  return (
    <div className="adjy-container adjy-section">
      <p className="adjy-eyebrow mb-5">404</p>
      <h1 className="adjy-display max-w-xl text-[clamp(1.9rem,4.2vw,3rem)]">
        Bu sayfa burada değil.
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Aradığın sayfa taşınmış, adı değişmiş ya da hiç var olmamış olabilir.
        Buradan devam edebilirsin.
      </p>

      <nav
        aria-label="Öneriler"
        className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"
      >
        {EXITS.map((exit) => (
          <Link
            key={exit.href}
            href={exit.href}
            className="group flex items-center justify-between gap-4 bg-background p-6 transition-colors hover:bg-surface-2"
          >
            <span>
              <span className="block text-[15px] font-medium tracking-tight">
                {exit.label}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {exit.description}
              </span>
            </span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}
      </nav>
    </div>
  );
}
