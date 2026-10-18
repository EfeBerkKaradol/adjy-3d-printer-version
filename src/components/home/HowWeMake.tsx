import Image from "next/image";

// ==========================================
// NASIL ÜRETİYORUZ
//
// Önceki hâli dört kutuda dört cümleydi; sayfadaki üç ayrı
// dört-kutulu ızgaradan biri. Hepsi aynı görünüyor, hiçbiri
// akılda kalmıyordu.
//
// Burada adımlar tek şerit hâlinde ilerliyor ve her birinin
// yanında ölçülebilir bir şey var: katman kalınlığı, tabla
// sınırı, kontrol. Rakam, sıfatın yapamadığını yapıyor.
// ==========================================

const ADIMLAR = [
  {
    n: "01",
    baslik: "Ölçü belirlenir",
    govde:
      "Hazır ölçüyle alabilir ya da kaydırıcıdan kendi ölçünüzü verebilirsiniz. Fiyat ölçüyle birlikte güncellenir; sipariş vermeden önce ikisini de görürsünüz.",
    deger: "25 üründe",
    etiket: "ölçü sizin",
  },
  {
    n: "02",
    baslik: "Üretim başlar",
    govde:
      "Sipariş düştükten sonra basılır ya da dökülür. 3D baskıda 0,2 milimetrelik katmanlar; döküm ürünlerde silikon kalıp ve alçı.",
    deger: "0,2 mm",
    etiket: "katman",
  },
  {
    n: "03",
    baslik: "Elden geçer",
    govde:
      "Destek izleri temizlenir, yüzey kontrol edilir, parçalar birbirine geçiyor mu bakılır. Kusurlu olan yeniden basılır.",
    deger: "45 × 45 cm",
    etiket: "en büyük ölçü",
  },
  {
    n: "04",
    baslik: "Paketlenir",
    govde:
      "Kırılabilir parçalar ayrı korumaya alınır. Çok parçalı ürünler takılı değil, ayrı ayrı gelir; montajı aletsiz yaparsınız.",
    deger: "Aletsiz",
    etiket: "montaj",
  },
];

export function HowWeMake({ gorsel }: { gorsel: string | null }) {
  return (
    <section className="border-t border-border/60">
      <div className="adjy-container py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="adjy-eyebrow mb-5">Üretim</p>
            <h2 className="adjy-display text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.1]">
              Siparişten sonra
              <br />
              başlar.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
              Depodan bir kutu alıp göndermiyoruz. Her ürün sipariş geldikten
              sonra, Beşiktaş&apos;taki atölyemizde üretiliyor.
            </p>

            {gorsel && (
              <div className="relative mt-9 hidden aspect-[4/3] overflow-hidden rounded-2xl bg-muted lg:block">
                <Image
                  src={gorsel}
                  alt=""
                  fill
                  sizes="40vw"
                  className="object-cover"
                  aria-hidden
                />
              </div>
            )}
          </div>

          <ol className="divide-y divide-border border-y border-border">
            {ADIMLAR.map((a) => (
              <li key={a.n} className="grid gap-4 py-8 sm:grid-cols-[auto_1fr_auto] sm:gap-8">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {a.n}
                </span>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">{a.baslik}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {a.govde}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-lg font-medium tabular-nums">{a.deger}</p>
                  <p className="text-xs text-muted-foreground">{a.etiket}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
