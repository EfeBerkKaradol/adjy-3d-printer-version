import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  TASARIM_ARACLARI,
  VITRIN_ARACI,
  aracAdresi,
  aracBul,
  aracGorseli,
} from "@/lib/tasarim/catalog";
import { tumTasarimUrunleri } from "@/lib/tasarim/ensure";
import { resolvePublicImage } from "@/lib/publicAsset";
import { TasarimAracKartlari } from "@/components/tasarim/TasarimAracKartlari";
import { PixelLink } from "@/components/ui/pixel-link";
import { yilbasiAktif } from "@/lib/yilbasi";
import { YilbasiBandi } from "@/components/yilbasi/YilbasiBandi";
import { cn } from "@/lib/utils";

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
//
// Giriş bölümü ürünleri hemen gösterir: yazının yanında dört
// ürünün kendi 3B sahnesinden alınmış kareleri, altında bütün
// ürün adlarının aktığı şerit. En yeni ürün ızgaranın başında
// büyük durur.
// ==========================================

export const metadata: Metadata = {
  title: "Kendin Tasarla",
  description:
    "Ses dalgası plaketi, fotoğraflı yapboz ve hediye kutusu, isimli yılbaşı süsü, dalgalı vazo ve avize: ölçüsünü, rengini, yazısını siz seçin. Modeli ekranda görün, fiyatı anında öğrenin; atölyemizde birebir üretelim.",
  alternates: { canonical: "/tasarla" },
  openGraph: {
    title: "Kendin Tasarla | ADJY",
    description:
      "Ürünü kendi ölçünüzde kurun, modelde görün, fiyatı anında öğrenin.",
  },
};

// Ürün satırları ilk ziyarette açılır; derleme anında
// veritabanına yazılmasın. Sayfa bu yüzden istek anında
// çiziliyor ama ucuz: satırlar sunucu belleğinde tutulur
// (ensure.ts), çoğu istek veritabanına hiç gitmez.
export const dynamic = "force-dynamic";

/** Izgaranın başında büyük duran ürün (catalog.ts, ONE_CIKANLAR) */
const VITRIN = VITRIN_ARACI;
/** Girişteki dört kare: birbirinden farklı görünen ürünler */
const KOLAJ = ["ses-dalgasi-plaketi", "foto-kutu", "neon-sahil-tabela", "foto-yapboz"];

const NASIL = [
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
];

function AdSeridi({ gizli }: { gizli?: boolean }) {
  return (
    <div className="adjy-serit-seri" aria-hidden={gizli}>
      {TASARIM_ARACLARI.map((a) => (
        <span key={a.id} className="adjy-serit-madde">
          {a.ad}
          <span className="adjy-serit-ayrac" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </div>
  );
}

export default async function TasarlaPage() {
  // Satırları burada açmak, araçların mağaza listesinde de
  // görünmesini sağlar — kimsenin ayrı bir betik çalıştırmayı
  // hatırlaması gerekmez.
  await tumTasarimUrunleri();

  const kolaj = KOLAJ.map((id) => aracBul(id))
    .filter((a) => a !== null)
    .map((a) => ({ arac: a, gorsel: resolvePublicImage(aracGorseli(a.id)) }))
    .filter((k) => k.gorsel);

  return (
    <>
      <section className="border-b-2 border-dashed border-foreground/25 bg-muted/30">
        <div className="adjy-container grid items-center gap-10 py-12 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="lg:col-span-6">
            <p className="adjy-eyebrow mb-5 flex items-center gap-3">
              Kendin Tasarla
              <span className="h-px w-10 bg-foreground/30" aria-hidden />
              <span className="tabular-nums">{TASARIM_ARACLARI.length} ürün</span>
            </p>
            <h1 className="adjy-display text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95]">
              Ölçüsünü değil,
              <br />
              kendisini <span className="underline decoration-[0.08em] underline-offset-[0.12em]">siz</span> kurun.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
              Buradaki ürünlerin hazır bir hâli yok. Saksının kaç dilimli
              olacağını, kutunun hangi duvarında kesit açılacağını, lambanın
              üstünde hangi fotoğrafın belireceğini siz belirliyorsunuz.
              Değiştirdiğiniz her şey modelde ve fiyatta anında görünüyor.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PixelLink href="#urunler" variant="solid">
                Ürünleri gör
              </PixelLink>
              <PixelLink href="#nasil" variant="outline">
                Nasıl çalışır
              </PixelLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 border-y-2 border-dashed border-foreground/20">
              {[
                ["Model", "Ekranda 3B"],
                ["Fiyat", "Anında"],
                ["Üretim", "Siparişe özel"],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  className={cn("py-3.5", i > 0 && "border-l-2 border-dashed border-foreground/20 pl-4")}
                >
                  <dt className="adjy-eyebrow">{k}</dt>
                  <dd className="mt-1.5 text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Dört ürün, ikişer sütunda; sağ sütun aşağı kayık durur */}
          {kolaj.length > 0 && (
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:col-span-6" aria-label="Öne çıkan ürünler">
              {kolaj.map(({ arac, gorsel }, i) => (
                <li key={arac.id} className={cn(i % 2 === 1 && "sm:translate-y-10")}>
                  <Link href={aracAdresi(arac.id)} className="adjy-pixel-card group block">
                    <div className="relative aspect-square overflow-hidden bg-surface-2">
                      <Image
                        src={gorsel!}
                        alt={arac.ad}
                        fill
                        priority
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                    </div>
                    <p className="flex items-center justify-between gap-2 border-t-2 border-dashed border-foreground/80 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                      <span className="truncate">{arac.ad}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Bütün ürünlerin adları akar: neler kurulabildiği tek bakışta */}
      <div className="overflow-hidden bg-foreground text-background [&_.adjy-serit-madde]:py-3 [&_.adjy-serit-madde]:text-[13px]">
        <div className="adjy-serit" role="complementary" aria-label="Kurabileceğiniz ürünler">
          <AdSeridi />
          <AdSeridi gizli />
        </div>
      </div>

      <div id="urunler" className="adjy-container scroll-mt-28 py-12 lg:py-16">
        {yilbasiAktif() && <YilbasiBandi className="mb-10" />}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="adjy-display text-[clamp(1.6rem,3vw,2.4rem)]">Bir ürün seçin, kurmaya başlayın.</h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Kartın üzerine gelin: aynı ürünün başka bir kurulumu görünür.
          </p>
        </div>
        <TasarimAracKartlari araclar={TASARIM_ARACLARI} vitrin={VITRIN} baslikEtiketi="h3" />
      </div>

      <section id="nasil" className="scroll-mt-28 bg-foreground text-background">
        <div className="adjy-container py-14 lg:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-background/60">
            Nasıl çalışır
          </p>
          <h2 className="adjy-display mt-4 max-w-3xl text-[clamp(1.8rem,4vw,3.2rem)]">
            Ekranda kurduğunuz parça, elinize gelen parça.
          </h2>
          <ol className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-3">
            {NASIL.map((m, i) => (
              <li key={m.b} className="border-t-2 border-dashed border-background/25 pt-6">
                <span className="font-mono text-4xl font-semibold tabular-nums text-background/35 lg:text-5xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-lg font-semibold leading-snug">{m.b}</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/70">{m.g}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <PixelLink href="#urunler" variant="outline" className="bg-foreground text-background [--px:var(--background)]">
              Kurmaya başla
            </PixelLink>
          </div>
        </div>
      </section>
    </>
  );
}
