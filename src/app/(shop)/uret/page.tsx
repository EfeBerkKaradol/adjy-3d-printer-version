import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, Upload } from "lucide-react";
import { TASARIM_ARACLARI } from "@/lib/tasarim/catalog";
import { tumTasarimUrunleri } from "@/lib/tasarim/ensure";
import { TasarimAracKartlari } from "@/components/tasarim/TasarimAracKartlari";
import { yilbasiAktif } from "@/lib/yilbasi";
import { YilbasiBandi } from "@/components/yilbasi/YilbasiBandi";

export const metadata: Metadata = {
  title: "Üret",
  description:
    "Fotoğraflı yapbozdan ses dalgası plaketine, isimlikten avizeye: özelleştirilebilir ürünleri kendin kur, elindeki 3D modeli yükle ya da bir fotoğraftan yeni bir ürün oluştur. ADJY atölyesi üretsin.",
  openGraph: {
    title: "Üret | ADJY Shopping",
    description:
      "Kendi modelinizi yükleyin ya da bir fotoğraftan 3D ürün oluşturun. Ölçüsünü belirleyin, odanızda görün, ürettirin.",
  },
};

// ==========================================
// ÜRET
//
// Üret, parametrik ürün altyapısının vitrini: mağazadaki
// "Kendin Tasarla" ürünlerinin hepsi burada da listelenir ve
// aynı tasarım aracına, aynı sepete, aynı üretim ekranına
// bağlanır. Altında iki serbest başlangıç durur: elinde model
// olan yükler, olmayan fotoğraftan başlar.
// ==========================================

// Ürün satırları ilk ziyarette açılır (ensure.ts);
// derleme anında veritabanına yazılmasın. Satırlar sunucu
// belleğinde tutulduğu için çoğu istek veritabanına gitmez.
export const dynamic = "force-dynamic";

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

export default async function UretPage() {
  // Araçların sepete bağlanacağı ürün satırları yoksa açılır —
  // mağaza listesinde de görünmeleri buna bağlı.
  await tumTasarimUrunleri();

  return (
    <div className="adjy-container adjy-section">
      {yilbasiAktif() && <YilbasiBandi className="mb-10" />}
      <p className="adjy-eyebrow mb-5">ADJY Shopping</p>
      <h1 className="adjy-display max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)]">
        Fikrini ürüne dönüştür.
      </h1>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        Parametrik ürünlerimizi kendi ölçünde kur, elindeki modeli yükle
        ya da bir fotoğraftan yeni bir 3D ürün oluştur.
      </p>

      <section className="mt-14" aria-labelledby="uret-parametrik">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="adjy-eyebrow mb-3">Kendin Tasarla · {TASARIM_ARACLARI.length} ürün</p>
            <h2 id="uret-parametrik" className="text-2xl font-medium tracking-tight">
              Özelleştirilebilir ürünlerin hepsi
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Her ürün kendi tasarım aracıyla açılır: ölçüsünü, rengini, yazısını
              ya da fotoğrafını sen seçersin, model ve fiyat anında güncellenir.
              Sipariş verdiğinde kurduğun model atölyeye olduğu gibi ulaşır.
            </p>
          </div>
          <Link
            href="/tasarla"
            className="inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium"
          >
            Tümü
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <TasarimAracKartlari araclar={TASARIM_ARACLARI} baslikEtiketi="h3" />
      </section>

      <h2 className="mt-16 text-2xl font-medium tracking-tight">Kendi fikrinden başla</h2>

      <div className="mt-6 grid gap-px overflow-hidden rounded-lg adjy-pixel-frame bg-border md:grid-cols-2">
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
