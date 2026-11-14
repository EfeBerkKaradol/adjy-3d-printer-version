import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TASARIM_ARACLARI,
  aracAdresi,
  aracBul,
  aracGorseli,
  aracGorselleri,
  aracOzellestirmeAdresi,
} from "@/lib/tasarim/catalog";
import { tasarimBaslangicFiyati } from "@/lib/tasarim/pricing";
import { tasarimUrunuBul } from "@/lib/tasarim/ensure";
import { resolvePublicImage } from "@/lib/publicAsset";
import { TasarimGalerisi } from "@/components/tasarim/TasarimGalerisi";
import { PixelLink } from "@/components/ui/pixel-link";
import { PixelTag } from "@/components/home/PixelMoreButton";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getAbsoluteUrl } from "@/lib/url";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// TASARIM ÜRÜNÜ — TANITIM SAYFASI
//
// Önceden karta tıklayan doğrudan tasarım aracına düşüyordu:
// ürünün ne olduğunu, neye benzediğini ve neyi
// değiştirebileceğini görmeden kaydırıcıların karşısına.
// Mağazadaki ürünlerde böyle değil — önce ürün görülür, sonra
// ölçüsü seçilir.
//
// Bu sayfa o adımı geri getiriyor: görseller, ürünün ne işe
// yaradığı, neleri değiştirebileceğiniz ve fiyatı. Özelleştirme
// buradan sonra, kendi sayfasında açılır.
//
// Görseller fotoğraf değil, aracın kendi 3B sahnesinden alınmış
// kareler; her biri gerçekten sipariş edilebilen bir
// yapılandırma. Altyazıları hangisi olduğunu söyler.
// ==========================================

// Ürün satırı ilk ziyarette açılır; derleme anında
// veritabanına yazılmasın.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ arac: string }>;
}): Promise<Metadata> {
  const { arac: id } = await params;
  const arac = aracBul(id);
  if (!arac) return {};
  const fiyat = tasarimBaslangicFiyati(arac);
  return {
    title: `${arac.ad} — Kendin Tasarla`,
    description: `${arac.aciklama} ${fiyat.toLocaleString("tr-TR")} TL'den, ölçünüze göre.`,
    keywords: arac.anahtarKelimeler,
    alternates: { canonical: aracAdresi(arac.id) },
    openGraph: {
      title: `${arac.ad} | ADJY`,
      description: arac.ozet,
      images: [aracGorseli(arac.id)],
    },
  };
}

const ADIMLAR = [
  {
    b: "Kurun",
    g: "Ölçüyü, biçimi ve ayrıntıları seçin. Değiştirdiğiniz her şey modelde ve fiyatta anında görünür.",
  },
  {
    b: "Sipariş verin",
    g: "Kurduğunuz model sepete seçimlerinizle birlikte girer. Ödemeyi tamamladığınızda atölyemize ulaşır.",
  },
  {
    b: "Üretiyoruz",
    g: "Parça, sizin kurduğunuz dosyadan basılır. Ekranda gördüğünüz ile elinize gelen aynı modeldir.",
  },
];

export default async function TasarimUrunPage({
  params,
}: {
  params: Promise<{ arac: string }>;
}) {
  const { arac: id } = await params;
  const arac = aracBul(id);
  if (!arac) notFound();

  // Ürün satırı burada da açılır: sayfa mağaza listesinden önce
  // ziyaret edilmiş olabilir.
  await tasarimUrunuBul(arac);

  const fiyat = tasarimBaslangicFiyati(arac);
  const baseUrl = getAbsoluteUrl();
  // Yalnızca gerçekten var olan görseller: eksik bir kare galeride
  // boş kutu olarak durmasın.
  const gorseller = aracGorselleri(arac).filter((g) => resolvePublicImage(g.adres));
  const digerleri = TASARIM_ARACLARI.filter((a) => a.id !== arac.id).slice(0, 4);
  const ozellestir = aracOzellestirmeAdresi(arac.id);

  return (
    <div className="pb-20">
      <BreadcrumbJsonLd
        items={[
          { name: "Kendin Tasarla", url: `${baseUrl}/tasarla` },
          { name: arac.ad, url: `${baseUrl}${aracAdresi(arac.id)}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: arac.ad,
            description: arac.aciklama,
            image: gorseller.map((g) => `${baseUrl}${g.adres}`),
            brand: { "@type": "Brand", name: "ADJY" },
            material: arac.malzeme,
            offers: {
              "@type": "Offer",
              price: fiyat,
              priceCurrency: "TRY",
              availability: "https://schema.org/MadeToOrder",
              url: `${baseUrl}${aracAdresi(arac.id)}`,
            },
          }),
        }}
      />

      <div className="adjy-container">
        <nav aria-label="Konum" className="py-6">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <li>
              <Link href="/tasarla" className="transition-colors hover:text-foreground">
                Kendin Tasarla
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground">{arac.ad}</li>
          </ol>
        </nav>

        {/* ---------- GÖRSEL VE SATIN ALMA ---------- */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <TasarimGalerisi ad={arac.ad} gorseller={gorseller} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/tasarla"
                className="adjy-eyebrow transition-colors hover:text-foreground"
              >
                Kendin Tasarla
              </Link>
              <PixelTag>Ölçüye özel</PixelTag>
            </div>
            <h1 className="adjy-display mt-3 text-[clamp(1.8rem,3.6vw,2.8rem)]">
              {arac.ad}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {arac.aciklama}
            </p>

            {/* Fiyat gerçek bir kurulumun fiyatı: aracın açıldığı
                varsayılan hâlin. "…'den başlar" demiyoruz. */}
            <div className="mt-8 border-y-2 border-dashed border-foreground/25 py-6">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold tabular-nums">
                  {formatTRY(fiyat)}
                </span>
                <span className="text-sm text-muted-foreground">
                  varsayılan ölçüde · KDV dâhil
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Fiyat, kurduğunuz parçanın malzemesinden ve baskı süresinden
                hesaplanır; ölçüyü değiştirdikçe güncellenir.
                {arac.ekMaliyetAciklamasi
                  ? ` ${arac.ekMaliyetAciklamasi} fiyata dâhildir.`
                  : ""}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <PixelLink href={ozellestir} variant="solid">
                  Özelleştir ve sipariş ver
                </PixelLink>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {arac.teslim}
              </p>
            </div>

            {/* ---------- NELERİ DEĞİŞTİREBİLİRSİNİZ ---------- */}
            <section className="mt-8" aria-labelledby="ayarlar-baslik">
              <h2 id="ayarlar-baslik" className="adjy-eyebrow">
                Neleri değiştirebilirsiniz
              </h2>
              <ul className="mt-4 divide-y-2 divide-dashed divide-foreground/15">
                {arac.ayarlar.map((ayar, i) => (
                  <li key={ayar} className="flex items-baseline gap-4 py-2.5 text-sm">
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {ayar}
                  </li>
                ))}
              </ul>
            </section>

            <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <dt className="adjy-eyebrow">Malzeme</dt>
                <dd className="mt-1.5">
                  {arac.malzeme}
                  {arac.malzemeSabit ? "" : " (araçta değiştirilebilir)"}
                </dd>
              </div>
              <div>
                <dt className="adjy-eyebrow">Üretim</dt>
                <dd className="mt-1.5">Siparişe özel, atölyemizde 3D baskı</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ---------- ÖNE ÇIKANLAR ---------- */}
        <section className="mt-20" aria-label="Öne çıkan özellikler">
          <ul className="grid gap-4 md:grid-cols-3">
            {arac.vurgular.map((v, i) => (
              <li key={v.baslik} className="adjy-pixel-card flex flex-col p-6">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 text-lg font-semibold leading-snug tracking-tight">
                  {v.baslik}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {v.metin}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- NASIL İLERLİYOR ---------- */}
        <section
          className="mt-20 border-t-2 border-dashed border-foreground/25 pt-12"
          aria-labelledby="adimlar-baslik"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="adjy-eyebrow">Nasıl ilerliyor</p>
              <h2
                id="adimlar-baslik"
                className="adjy-display mt-3 text-[clamp(1.4rem,2.6vw,2rem)]"
              >
                Üç adımda sizin ölçünüzde.
              </h2>
            </div>
            <PixelLink href={ozellestir} variant="outline">
              Özelleştirmeye başla
            </PixelLink>
          </div>
          <ol className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-3">
            {ADIMLAR.map((a, i) => (
              <li key={a.b}>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold">{a.b}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.g}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- DİĞER TASARIM ÜRÜNLERİ ---------- */}
        <section className="mt-20" aria-labelledby="diger-baslik">
          <div className="flex items-end justify-between gap-6">
            <h2 id="diger-baslik" className="adjy-display text-[clamp(1.3rem,2.4vw,1.8rem)]">
              Kendiniz kurabileceğiniz diğer ürünler
            </h2>
            <Link
              href="/tasarla"
              className="shrink-0 text-sm underline underline-offset-4 hover:text-muted-foreground"
            >
              Tümü
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {digerleri.map((d) => {
              const gorsel = resolvePublicImage(aracGorseli(d.id));
              return (
                <li key={d.id}>
                  <Link
                    href={aracAdresi(d.id)}
                    data-lift
                    className="adjy-pixel-card group flex h-full flex-col"
                  >
                    <div
                      className="aspect-square bg-surface-2 bg-cover bg-center"
                      style={gorsel ? { backgroundImage: `url(${gorsel})` } : undefined}
                      role="img"
                      aria-label={d.ad}
                    />
                    <div className="flex flex-1 flex-col border-t-2 border-dashed border-foreground/80 px-3.5 py-3">
                      <h3 className="text-[15px] font-semibold leading-snug">{d.ad}</h3>
                      <p className="mt-1.5 font-mono text-xs tabular-nums">
                        <span className="text-muted-foreground">Başlangıç </span>
                        <span className="font-semibold">
                          {formatTRY(tasarimBaslangicFiyati(d))}
                        </span>
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
