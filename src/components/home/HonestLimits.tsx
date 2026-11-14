
// ==========================================
// NEYE HAYIR DİYORUZ
//
// Hakkımızda sayfaları birbirine benziyor çünkü hepsi aynı
// şeyi yapıyor: yapabildiklerini sayıyor. Oysa bir üreticiye
// güvenip güvenmeyeceğinizi, yapamadığını söyleyip
// söylemediğinden anlarsınız.
//
// Buradaki maddelerin hepsi gerçek sınırlar — tabla ölçüsü,
// kalıbın tek ölçü olması, stok tutmamak. Hiçbiri pazarlama
// cümlesi değil; sistemde karşılığı olan, siparişi
// reddetmemize yol açan kurallar.
// ==========================================

const SINIRLAR = [
  {
    baslik: "Stok tutmuyoruz",
    govde:
      "Sipariş gelmeden hiçbir şey basılmaz. Bu yüzden ürün elinize bir rafın arkasından değil, tezgâhtan çıkarak gelir — ama aynı gün kargoya veremeyiz.",
  },
  {
    baslik: "Döküm ürünlerin ölçüsü değişmez",
    govde:
      "Alçı ve seramik ürünler silikon kalıptan dökülür, kalıp tek ölçüdür. Sekiz ürünümüzde kaydırıcı yok; olmayan bir seçeneği varmış gibi göstermiyoruz.",
  },
  {
    baslik: "45 × 45 santimden büyüğünü yapmıyoruz",
    govde:
      "Tablamız bu kadar. 25 santimi geçen işler daha yavaş ve daha pahalı makineye düşer; fiyat da o yüzden artar. Daha büyüğü için teklif vermek yerine hayır diyoruz.",
  },
  {
    baslik: "Kusurlu parçayı yollamıyoruz",
    govde:
      "Her parça yola çıkmadan elden geçer. Katmanı kaçmış ya da yüzeyi bozulmuş parça yeniden üretilir; bu durumda teslimat gecikebilir.",
  },
];

/** Piksel çarpı: koyu bantta "yapmıyoruz" işareti */
function PikselCarpi() {
  return (
    <svg
      viewBox="0 0 7 7"
      className="mt-1 h-4 w-4 shrink-0 text-background/60"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5, 6].flatMap((i) => [
        <rect key={`a${i}`} x={i} y={i} width={1} height={1} />,
        i !== 3 ? <rect key={`b${i}`} x={6 - i} y={i} width={1} height={1} /> : null,
      ])}
    </svg>
  );
}

export function HonestLimits() {
  return (
    <section className="border-t-2 border-dashed border-foreground/25 bg-foreground text-background">
      <div className="adjy-container py-16 lg:py-24">
        <div className="max-w-2xl">
          <p className="adjy-eyebrow mb-5 text-background/60">Sınırlarımız</p>
          <h2 className="adjy-display text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.1]">
            Yapamadığımız şeyler de var.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-background/70">
            Bir üreticiye güvenip güvenmeyeceğinize, yapabildiklerinden çok
            yapamadıklarını söyleyip söylemediğine bakarak karar verirsiniz.
            Bizim sınırlarımız şunlar.
          </p>
        </div>

        <ul className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {SINIRLAR.map((s) => (
            <li key={s.baslik} className="flex gap-4 border-t-2 border-dashed border-background/25 pt-6">
              <PikselCarpi />
              <div>
                <h3 className="text-[17px] font-medium tracking-tight">{s.baslik}</h3>
                <p className="mt-2 text-sm leading-relaxed text-background/70">
                  {s.govde}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
