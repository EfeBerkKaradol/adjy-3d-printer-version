import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, Upload } from "lucide-react";

export const metadata: Metadata = {
  title: "Üret",
  description:
    "Elindeki 3D modeli yükle ya da bir fotoğraftan yeni bir ürün oluştur. Ölçüyü sen belirle, ADJY üretsin.",
  openGraph: {
    title: "Üret | ADJY Shopping",
    description:
      "Modelini yükle veya bir fotoğraftan 3D ürün oluştur. Ölçüsünü değiştir, odanda gör, üret.",
  },
};

// ==========================================
// ÜRET
//
// Bu sayfa iki niyeti ayırır: elinde model olan yükler,
// olmayan fotoğraftan başlar. İkisi de aynı yere çıkar —
// ölçü, fiyat, üretim.
// ==========================================

const OPTIONS = [
  {
    href: "/uret/fotograftan-olustur",
    eyebrow: "01",
    title: "Fotoğraftan Oluştur",
    body: "Beğendiğin bir objeyi fotoğrafla. ADJY onu 3D modele dönüştürsün.",
    cta: "Fotoğraftan Oluştur",
    Icon: Camera,
  },
  {
    href: "/uret/model-yukle",
    eyebrow: "02",
    title: "Kendi Modelini Yükle",
    body: "3D modelini yükle, ölçülerini belirle ve üret.",
    cta: "Model Yükle",
    Icon: Upload,
  },
] as const;

export default function UretPage() {
  return (
    <div className="adjy-container adjy-section">
      <p className="adjy-eyebrow mb-5">ADJY Shopping</p>
      <h1 className="adjy-display max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)]">
        Fikrini ürüne dönüştür.
      </h1>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        Elindeki modeli yükle veya bir fotoğraftan yeni bir 3D ürün oluştur.
      </p>

      <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
        {OPTIONS.map(({ href, eyebrow, title, body, cta, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col justify-between bg-background p-8 transition-colors hover:bg-surface-2 md:p-10"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {eyebrow}
                </span>
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <h2 className="mt-6 text-xl font-medium tracking-tight">{title}</h2>
              <p className="mt-2.5 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
            <span className="mt-10 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium self-start">
              {cta}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
