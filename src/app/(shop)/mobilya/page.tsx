import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ODALAR, odaModelleri } from "@/lib/furniture/catalog";
import { ModelSematik } from "@/components/furniture/ModelSematik";

// ==========================================
// MOBİLYA — GİRİŞ
//
// Kategoriler ürün tipine göre değil ODAYA göre. İnsan "bana
// 180 santim kitaplık lazım" diye başlamıyor; "oturma odasına
// bir şey lazım" diye başlıyor ve ürün tipini orada seçiyor.
//
// ADJY'nin kuruluş fikri buydu zaten: mobilyayı tasarımcıya
// gitmeden, kendi ölçünde ısmarlamak. Baskı tarafı bunu küçük
// nesnelerde çözdü; burası asıl yapmak istediğimiz iş.
// ==========================================

export const metadata: Metadata = {
  title: "Ölçüye Özel Mobilya",
  description:
    "Kitaplık, TV ünitesi, komodin ve duvar rafını kendi ölçünüzde kurun. Ölçüyü, sütunu, kapak ve çekmeceleri siz belirleyin; fiyatı anında görün.",
  alternates: { canonical: "/mobilya" },
  openGraph: {
    title: "Ölçüye Özel Mobilya | ADJY",
    description:
      "Mobilyayı kendi ölçünüzde kurun, odanızda görün, fiyatı anında öğrenin.",
  },
};

export default function MobilyaPage() {
  return (
    <div>
      <section className="border-b border-border/60">
        <div className="adjy-container py-16 lg:py-24">
          <div className="max-w-2xl">
            <p className="adjy-eyebrow mb-5">Mobilya</p>
            <h1 className="adjy-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05]">
              Duvarınızın ölçüsü neyse, mobilya o ölçüde.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Hazır mobilya duvara uymaz; duvar hazır mobilyaya hiç uymaz.
              Burada ölçüyü, sütun sayısını ve hangi gözün kapaklı olacağını
              siz belirliyorsunuz. Değiştirdiğiniz her şey modelde ve fiyatta
              anında görünüyor — tasarımcıya gitmenize, teklif beklemenize
              gerek kalmıyor.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Üretim anlaşmalı atölyemizde yapılıyor. Kurduğunuz yapılandırma
              doğrudan kesim listesine dönüşüyor; ekranda gördüğünüz parça
              listesiyle tezgâha giden liste aynı.
            </p>
          </div>
        </div>
      </section>

      <section className="adjy-container py-14 lg:py-20">
        <div className="space-y-16">
          {ODALAR.map((oda) => {
            const modeller = odaModelleri(oda.id);
            if (modeller.length === 0) return null;
            return (
              <div key={oda.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <div>
                    <h2 className="adjy-display text-[clamp(1.4rem,2.6vw,2rem)] leading-tight">
                      {oda.ad}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {oda.aciklama}
                    </p>
                  </div>
                  <Link
                    href={`/mobilya/${oda.id}`}
                    className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                  >
                    Hepsini gör
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>

                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {modeller.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/mobilya/${oda.id}/${m.slug}`}
                        className="group flex h-full flex-col rounded-2xl border border-border p-5 transition-colors hover:border-foreground/40 hover:bg-muted/40"
                      >
                        <ModelSematik
                          model={m}
                          className="h-36 w-full text-foreground/70 transition-colors group-hover:text-foreground"
                        />
                        <h3 className="mt-4 text-[17px] font-medium tracking-tight">
                          {m.ad}
                        </h3>
                        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {m.ozet}
                        </p>
                        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                          {m.genislik.min / 10}–{m.genislik.max / 10} cm
                          genişlik · {m.sutun.min}–{m.sutun.max} sütun
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/30">
        <div className="adjy-container py-14 lg:py-20">
          <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                b: "Ölçüyü siz veriyorsunuz",
                g: "Genişlik, yükseklik ve derinlik birer santim adımlarla ayarlanıyor. Ara ölçü diye bir şey yok; her ölçü üretilebilir ölçü.",
              },
              {
                b: "Sarkacak raf satmıyoruz",
                g: "18 mm levha 90 santimden uzun açıklıkta zamanla bel verir. Genişlik büyüdükçe en az sütun sayısı kendiliğinden artıyor.",
              },
              {
                b: "Fiyat kesim listesinden çıkıyor",
                g: "Levha, kenar bandı, menteşe, ray ve işçilik kalem kalem hesaplanıyor. Dökümü ürün sayfasında açıp görebilirsiniz.",
              },
              {
                b: "Odanızda gerçek ölçüsünde",
                g: "Kurduğunuz yapılandırma telefon kamerasıyla bulunduğunuz odaya yerleştirilebiliyor. Sipariş vermeden önce yerine bakın.",
              },
            ].map((x) => (
              <div key={x.b}>
                <h3 className="text-[15px] font-medium tracking-tight">{x.b}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {x.g}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
