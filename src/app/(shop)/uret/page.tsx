import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, Camera, Upload } from "lucide-react";
import { TASARIM_ARACLARI } from "@/lib/tasarim/catalog";
import { tumTasarimUrunleri } from "@/lib/tasarim/ensure";
import { TasarimAracKartlari } from "@/components/tasarim/TasarimAracKartlari";
import { yilbasiAktif } from "@/lib/yilbasi";
import { YilbasiBandi } from "@/components/yilbasi/YilbasiBandi";
import { PixelLink } from "@/components/ui/pixel-link";

export const metadata: Metadata = {
  title: "Üret",
  description:
    "Parametrik ürünlerimizi kendi ölçünde kur, elindeki 3D modeli yükle ya da bir fotoğraftan yeni bir ürün oluştur. Ölçüyü sen belirle, ADJY üretsin.",
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
// bağlanır. Burada yalnızca ilk beşi tek sırada durur, geri
// kalanı "Ayarlanabilir ürünleri gör" ile /tasarla'da açılır;
// böylece altındaki iki serbest başlangıç (elinde model olan
// yükler, olmayan fotoğraftan başlar) ilk ekrana yaklaşır.
// Üstteki "Kendin üret" düğmesi o bölüme kaydırır.
// ==========================================

/** Üret sayfasında tek sırada gösterilen parametrik ürün sayısı */
const GOSTERILEN_ARAC = 5;

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
      {/* Düz çapa: html'deki scroll-behavior: smooth kaydırmayı
          yumuşatır, hareket azaltma tercihinde anında atlar. */}
      {/* Boşluk sarmalayıcıda: .adjy-pixel-card katmansız
          margin: 2px verdiği için düğmenin kendi mt-* sınıfı
          etkisiz kalır. */}
      <div className="mt-12">
        <a
          href="#kendi-dosyan"
          className="adjy-pixel-card adjy-pixel-card-solid inline-flex items-center gap-3 px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.14em]"
        >
          Kendin üret
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      <section className="mt-14" aria-labelledby="uret-parametrik">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="adjy-eyebrow mb-3">Kendin Tasarla</p>
            <h2 id="uret-parametrik" className="text-2xl font-medium tracking-tight">
              Parametrik ürünler
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Her biri kendi tasarım aracıyla gelir: ölçüsünü ve ayrıntısını
              sen kurarsın, fiyat anında güncellenir, sipariş verdiğinde model
              atölyeye olduğu gibi ulaşır.
            </p>
          </div>
        </div>
        <TasarimAracKartlari
          araclar={TASARIM_ARACLARI.slice(0, GOSTERILEN_ARAC)}
          baslikEtiketi="h3"
          kompakt
        />
        <div className="mt-6 flex justify-end">
          <PixelLink href="/tasarla#urunler">
            Ayarlanabilir ürünleri gör
            <span className="text-muted-foreground">({TASARIM_ARACLARI.length})</span>
          </PixelLink>
        </div>
      </section>

      <section id="kendi-dosyan" className="mt-14 scroll-mt-28" aria-labelledby="uret-kendi-dosyan">
        <p className="adjy-eyebrow mb-3">Kendi Fikrin</p>
        <h2 id="uret-kendi-dosyan" className="text-2xl font-medium tracking-tight">
          Kendi dosyanı yükle, biz üretelim
        </h2>

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
                <h3 className="mt-6 text-xl font-medium tracking-tight">{title}</h3>
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
      </section>
    </div>
  );
}
