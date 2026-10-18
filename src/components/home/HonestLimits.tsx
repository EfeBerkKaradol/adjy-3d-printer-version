import { Minus } from "lucide-react";

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
      "Her parça yola çıkmadan elden geçer. Katmanı kaçmış, yüzeyi bozulmuş olan yeniden basılır — siz beklersiniz, biz de öyle.",
  },
];

export function HonestLimits() {
  return (
    <section className="border-t border-border/60 bg-foreground text-background">
      <div className="adjy-container py-16 lg:py-24">
        <div className="max-w-2xl">
          <p className="adjy-eyebrow mb-5 text-background/60">Sınırlarımız</p>
          <h2 className="adjy-display text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.1]">
            Yapamadığımız şeyler de var.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-background/70">
            Bir üreticiye güvenip güvenmeyeceğinize, yapabildiklerinden çok
            yapamadıklarını söyleyip söylemediğine bakarak karar verirsiniz.
            Bizimkiler şunlar.
          </p>
        </div>

        <ul className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {SINIRLAR.map((s) => (
            <li key={s.baslik} className="flex gap-4">
              <Minus className="mt-1 h-5 w-5 shrink-0 text-background/40" aria-hidden />
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
