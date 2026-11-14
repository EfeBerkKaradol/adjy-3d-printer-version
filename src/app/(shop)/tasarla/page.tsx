import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TASARIM_ARACLARI, aracAdresi, aracGorseli } from "@/lib/tasarim/catalog";
import { tasarimBaslangicFiyati } from "@/lib/tasarim/pricing";
import { tumTasarimUrunleri } from "@/lib/tasarim/ensure";
import { resolvePublicImage } from "@/lib/publicAsset";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// KENDİN TASARLA — GİRİŞ
//
// Mağazadaki ürünlerin ölçüsü değişiyor; buradakilerin
// kendisi kuruluyor. Her kart bir tasarım aracına açılır:
// saksının dilimini, kutunun kesitini, lambanın üstündeki
// fotoğrafı müşteri belirler.
//
// Kartta yazan fiyat gerçek bir kurulumun fiyatı — aracın
// açıldığı varsayılan hâlin. "…'den başlar" demiyoruz;
// büyütürseniz artar, küçültürseniz düşer.
// ==========================================

export const metadata: Metadata = {
  title: "Kendin Tasarla",
  description:
    "Saksı, avize, litofan lamba, elektronik kutusu, QR stand ve daha fazlası — ölçüsünü ve ayrıntılarını siz belirleyin. Tasarımınızı modelde görün, fiyatı anında öğrenin; atölyemizde birebir üretelim.",
  alternates: { canonical: "/tasarla" },
  openGraph: {
    title: "Kendin Tasarla | ADJY",
    description:
      "Ürünü kendi ölçünüzde kurun, modelde görün, fiyatı anında öğrenin.",
  },
};

// Ürün satırları ilk ziyarette açılır; derleme anında
// veritabanına yazılmasın.
export const dynamic = "force-dynamic";

export default async function TasarlaPage() {
  // Satırları burada açmak, araçların mağaza listesinde de
  // görünmesini sağlar — kimsenin ayrı bir betik çalıştırmayı
  // hatırlaması gerekmez.
  await tumTasarimUrunleri();

  return (
    <>
      <section className="border-b-2 border-dashed border-foreground/25 bg-muted/30">
        <div className="adjy-container py-12 lg:py-16">
          <div className="max-w-2xl">
            <p className="adjy-eyebrow mb-4">Kendin Tasarla</p>
            <h1 className="adjy-display text-[clamp(1.8rem,4vw,3rem)] leading-[1.05]">
              Ölçüsünü değil, kendisini siz kurun.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Buradaki ürünlerin hazır bir hâli yok. Saksının kaç dilimli
              olacağını, kutunun hangi duvarında kesit açılacağını, lambanın
              üstünde hangi fotoğrafın belireceğini siz belirliyorsunuz.
              Değiştirdiğiniz her şey modelde ve fiyatta anında görünüyor.
            </p>
            <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
              Kurduğunuz model, sipariş verdiğinizde atölyemize olduğu gibi
              ulaşıyor. Ekranda gördüğünüz parça ile basılan parça aynı
              dosyadan çıkıyor.
            </p>
          </div>
        </div>
      </section>

      <div className="adjy-container py-10 lg:py-14">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TASARIM_ARACLARI.map((a, i) => {
            const gorsel = resolvePublicImage(aracGorseli(a.id));
            return (
              <li key={a.id}>
                <Link
                  href={aracAdresi(a.id)}
                  className="group flex h-full flex-col overflow-hidden rounded-xl adjy-pixel-frame transition-colors hover:border-foreground/40"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                    {gorsel ? (
                      <Image
                        src={gorsel}
                        alt={a.ad}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={i < 3}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <ProductImageFallback slug={a.id} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="text-base font-medium leading-snug tracking-tight">
                      {a.ad}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {a.ozet}
                    </p>
                    <ul className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                      {a.ayarlar.map((ayar) => (
                        <li
                          key={ayar}
                          className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {ayar}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 flex items-baseline justify-between gap-3">
                      <span className="text-base font-medium tabular-nums">
                        {formatTRY(tasarimBaslangicFiyati(a))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        varsayılan ölçüde
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <section className="border-t-2 border-dashed border-foreground/25">
        <div className="adjy-container py-12 lg:py-16">
          <div className="grid gap-x-12 gap-y-8 sm:grid-cols-3">
            {[
              {
                b: "Model sizin kurduğunuz model",
                g: "Araç parçayı tarayıcınızda, girdiğiniz ölçülerle sıfırdan üretiyor. Hazır bir kalıbı büyütüp küçültmüyoruz.",
              },
              {
                b: "Fiyat malzemeden ve süreden çıkıyor",
                g: "Parçanın kaç gram filament ve kaç saat baskı istediği hesaplanıyor; fiyat bu ikisinden oluşuyor. Ölçü büyüdükçe neden arttığı belli.",
              },
              {
                b: "Basılamayacak ölçü seçilemiyor",
                g: "Kaydırıcıların sınırları yazıcının ve malzemenin sınırları. Seçebildiğiniz her ölçü üretilebilir ölçü.",
              },
            ].map((m) => (
              <div key={m.b}>
                <h2 className="text-sm font-medium">{m.b}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {m.g}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
