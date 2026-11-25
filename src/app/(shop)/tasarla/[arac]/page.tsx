import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TASARIM_ARACLARI,
  aracAdresi,
  aracBul,
  aracGorseli,
  aracAnimasyonu,
  aracGorselleri,
  aracOzellestirmeAdresi,
} from "@/lib/tasarim/catalog";
import { tasarimBaslangicFiyati } from "@/lib/tasarim/pricing";
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

// Sayfadaki her şey katalogdan (koddan) geliyor; veritabanına
// hiç dokunmadığı için derleme anında bir kez üretilir.
//
// Ürün satırını burada açmıyoruz: sayfa sonucunu kullanmıyordu,
// yalnızca her istekte bir sorgu bekletiyordu. Satırı, sepetin
// ona gerçekten bağlandığı özelleştirme sayfası açar; mağaza,
// /tasarla ve /uret listeleri de kendi ziyaretlerinde açar.
export function generateStaticParams() {
  return TASARIM_ARACLARI.map((a) => ({ arac: a.id }));
}

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

  const fiyat = tasarimBaslangicFiyati(arac);
  const baseUrl = getAbsoluteUrl();
  // Yalnızca gerçekten var olan görseller: eksik bir kare galeride
  // boş kutu olarak durmasın.
  const gorseller = aracGorselleri(arac).filter((g) => resolvePublicImage(g.adres));
  const digerleri = TASARIM_ARACLARI.filter((a) => a.id !== arac.id).slice(0, 4);
  const ozellestir = aracOzellestirmeAdresi(arac.id);
  const animasyon = aracAnimasyonu(arac);

  return (
    <div className="pb-28 lg:pb-0">
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
              <PixelTag>Ölçüye özel</PixelTag>
              <PixelTag>{arac.ayarlar.length} ayar</PixelTag>
              <PixelTag>Anında fiyat</PixelTag>
            </div>
            <h1 className="adjy-display mt-5 text-[clamp(2.2rem,4.4vw,3.8rem)]">{arac.ad}</h1>
            <p className="mt-4 text-lg font-medium leading-snug tracking-tight lg:text-xl">
              {arac.ozet}
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {arac.aciklama}
            </p>

            {/* Fiyat gerçek bir kurulumun fiyatı: aracın açıldığı
                varsayılan hâlin. "…'den başlar" demiyoruz. */}
            <div id="siparis" className="adjy-pixel-frame mt-8 bg-muted/40 p-5 sm:p-6">
              <p className="adjy-eyebrow">Varsayılan ölçüde · KDV dâhil</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight lg:text-5xl">
                {formatTRY(fiyat)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Fiyat, kurduğunuz parçanın malzemesinden ve baskı süresinden
                hesaplanır; ölçüyü değiştirdikçe güncellenir.
                {arac.ekMaliyetAciklamasi
                  ? ` ${arac.ekMaliyetAciklamasi} fiyata dâhildir.`
                  : ""}
              </p>
              <PixelLink
                href={ozellestir}
                variant="solid"
                className="mt-6 flex w-full justify-center py-4 text-[13px]"
              >
                Özelleştir ve sipariş ver
              </PixelLink>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t-2 border-dashed border-foreground/20 pt-5 text-sm">
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
                <div className="col-span-2">
                  <dt className="adjy-eyebrow">Teslim</dt>
                  <dd className="mt-1.5 text-muted-foreground">{arac.teslim}</dd>
                </div>
              </dl>
            </div>

            {/* ---------- NELERİ DEĞİŞTİREBİLİRSİNİZ ---------- */}
            <section className="mt-10" aria-labelledby="ayarlar-baslik">
              <h2 id="ayarlar-baslik" className="adjy-eyebrow">
                Neleri değiştirebilirsiniz
              </h2>
              {animasyon && (
                // Sessiz, kısa döngü: ayarlar değiştikçe ürünün aldığı biçimler
                <figure className="adjy-pixel-frame mt-4 overflow-hidden bg-muted/40">
                  <video
                    src={animasyon}
                    poster={gorseller[0]?.adres}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="aspect-square w-full object-cover"
                    aria-label={`${arac.ad}: ayarlar değiştikçe ürünün aldığı biçimler`}
                  />
                  <figcaption className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    Aynı ürün, farklı ayarlarla: biçim, ölçü ve renk değiştikçe ürün böyle görünür.
                  </figcaption>
                </figure>
              )}
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {arac.ayarlar.map((ayar, i) => (
                  <li
                    key={ayar}
                    className="flex items-start gap-3 border-2 border-dashed border-foreground/15 px-3.5 py-3 text-sm leading-snug"
                  >
                    <span className="mt-px font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {ayar}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* ---------- ÖNE ÇIKANLAR: koyu bant ---------- */}
      <section className="mt-20 bg-foreground text-background" aria-labelledby="vurgu-baslik">
        <div className="adjy-container py-14 lg:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-background/60">
            Neden bu ürün
          </p>
          <h2 id="vurgu-baslik" className="adjy-display mt-4 max-w-3xl text-[clamp(1.8rem,3.6vw,3rem)]">
            Bu ürünü farklı kılan {arac.vurgular.length} şey.
          </h2>
          <ul className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {arac.vurgular.map((v, i) => (
              <li key={v.baslik} className="border-t-2 border-dashed border-background/25 pt-6">
                <span className="font-mono text-4xl font-semibold tabular-nums text-background/35 lg:text-5xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-lg font-semibold leading-snug">{v.baslik}</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/70">{v.metin}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="adjy-container">
        {/* ---------- NASIL İLERLİYOR ---------- */}
        <section className="mt-20" aria-labelledby="adimlar-baslik">
          <p className="adjy-eyebrow">Nasıl ilerliyor</p>
          <h2 id="adimlar-baslik" className="adjy-display mt-3 text-[clamp(1.4rem,2.6vw,2rem)]">
            Üç adımda sizin ölçünüzde.
          </h2>
          <ol className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-3">
            {ADIMLAR.map((a, i) => (
              <li key={a.b} className="border-t-2 border-dashed border-foreground/25 pt-5">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold">{a.b}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.g}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- SON ÇAĞRI ---------- */}
        <section
          className="adjy-pixel-frame mt-16 grid items-center gap-8 overflow-hidden bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[220px_minmax(0,1fr)_auto]"
          aria-label="Özelleştirmeye başla"
        >
          {gorseller[0] && (
            <div className="relative hidden aspect-square self-stretch bg-surface-2 lg:block">
              <Image src={gorseller[0].adres} alt="" fill sizes="220px" className="object-cover" />
            </div>
          )}
          <div className="px-6 pt-8 sm:py-8 lg:px-0">
            <p className="adjy-eyebrow">Sıra sizde</p>
            <p className="adjy-display mt-3 text-[clamp(1.5rem,2.8vw,2.2rem)]">
              {arac.ad}, sizin ölçünüzde.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Varsayılan ölçüde {formatTRY(fiyat)}; her değişiklik fiyata anında yansır.
            </p>
          </div>
          <div className="px-6 pb-8 sm:py-8 sm:pr-8">
            <PixelLink href={ozellestir} variant="solid" className="py-4">
              Özelleştirmeye başla
            </PixelLink>
          </div>
        </section>

        {/* ---------- DİĞER TASARIM ÜRÜNLERİ ---------- */}
        <section className="mt-20 pb-20" aria-labelledby="diger-baslik">
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
                    {/* Arka plan görseli olarak galerinin tam boy dosyası
                        sayfa açılır açılmaz iniyordu; next/image kartın
                        boyutuna küçültür ve ekrana yaklaşınca yükler. */}
                    <div className="relative aspect-square overflow-hidden bg-surface-2">
                      {gorsel && (
                        <Image
                          src={gorsel}
                          alt={d.ad}
                          fill
                          sizes="(max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col border-t-2 border-dashed border-foreground/80 px-3.5 py-3">
                      <h3 className="text-[15px] font-semibold leading-snug">{d.ad}</h3>
                      <p className="mt-1.5 font-mono text-xs tabular-nums">
                        <span className="text-muted-foreground">Varsayılan ölçüde </span>
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

      {/* Telefonda fiyat ve sipariş düğmesi ekranın altında hep durur */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-dashed border-foreground/30 bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{arac.ad}</p>
            <p className="text-lg font-semibold tabular-nums">{formatTRY(fiyat)}</p>
          </div>
          <PixelLink href={ozellestir} variant="solid" className="shrink-0">
            Özelleştir
          </PixelLink>
        </div>
      </div>
    </div>
  );
}
