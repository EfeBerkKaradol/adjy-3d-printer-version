import type { Metadata } from "next";
import { MODELLER } from "@/lib/furniture/catalog";
import { OdaDuzeni } from "@/components/furniture/OdaDuzeni";

// ==========================================
// MOBİLYA — GİRİŞ
//
// ADJY'nin kuruluş fikri buydu: mobilyayı tasarımcıya
// gitmeden, kendi ölçünde ısmarlamak ve sipariş vermeden önce
// odanda görmek. Baskı tarafı bunu küçük nesnelerde çözdü;
// burası asıl yapmak istediğimiz iş.
//
// Giriş bütün katalogu gösteriyor, oda seçimi soldan. Hangi
// odada olduğunu bilen doğrudan oraya gidiyor, bilmeyen
// hepsini görüyor.
// ==========================================

export const metadata: Metadata = {
  title: "Ölçüye Özel Mobilya",
  description:
    "Kitaplık, gardırop, mutfak dolabı, yemek masası ve daha fazlası — kendi ölçünüzde. Ölçüyü, sütunu, kapak ve çekmeceleri siz belirleyin; fiyatı anında görün, odanızda deneyin.",
  alternates: { canonical: "/mobilya" },
  openGraph: {
    title: "Ölçüye Özel Mobilya | ADJY",
    description:
      "Mobilyayı kendi ölçünüzde kurun, odanızda görün, fiyatı anında öğrenin.",
  },
};

export default function MobilyaPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-muted/30">
        <div className="adjy-container py-12 lg:py-16">
          <div className="max-w-2xl">
            <p className="adjy-eyebrow mb-4">Mobilya</p>
            <h2 className="adjy-display text-[clamp(1.8rem,4vw,3rem)] leading-[1.05]">
              Duvarınızın ölçüsü neyse, mobilya o ölçüde.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Hazır mobilya duvara uymaz; duvar hazır mobilyaya hiç uymaz.
              Burada ölçüyü, sütun sayısını ve hangi gözün kapaklı olacağını
              siz belirliyorsunuz. Değiştirdiğiniz her şey modelde ve fiyatta
              anında görünüyor — tasarımcıya gitmenize, teklif beklemenize
              gerek kalmıyor.
            </p>
            <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
              Üretim anlaşmalı atölyemizde yapılıyor. Kurduğunuz yapılandırma
              doğrudan kesim listesine dönüşüyor; ekranda gördüğünüz parça
              listesiyle tezgâha giden liste aynı.
            </p>
          </div>
        </div>
      </section>

      <OdaDuzeni
        aktifOda={null}
        modeller={MODELLER}
        baslik="Bütün ürünler"
        aciklama={`${MODELLER.length} ürün tipi. Bir tanesini seçin, ölçüsünü kendi odanıza göre kurun; fiyat siz değiştirdikçe güncellensin.`}
      />

      <section className="border-t border-border/60">
        <div className="adjy-container py-12 lg:py-16">
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
    </>
  );
}
