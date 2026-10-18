import { Ruler, Scan, Hammer, ShieldCheck } from "lucide-react";

// ==========================================
// GÜVEN ŞERİDİ
//
// Tanınmayan bir mağazada ilk soru "bunlar kim?" oluyor.
// Dört kısa cevap, ürünlerin hemen üstünde: hepsi sitede
// gerçekten karşılığı olan şeyler, süs değil.
//
// Dil ticari ve kısa tutuluyor. Önceki hâli müşteriyle
// gereğinden samimi konuşuyordu — "kart bilgileri bize hiç
// gelmez" gibi. Ödeme güvenliği anlatılırken teklifsizlik
// güven vermiyor; bilgi veriyor.
// ==========================================

const MADDELER = [
  {
    icon: Ruler,
    title: "Özel ölçüde üretim",
    body: "Ürünlerin çoğunda en ve boy ölçüsü sipariş sırasında belirlenir.",
  },
  {
    icon: Scan,
    title: "Gerçek ölçüde önizleme",
    body: "Ürün, telefon kamerasıyla bulunduğu alanda gerçek ölçüsünde görüntülenebilir.",
  },
  {
    icon: Hammer,
    title: "Kendi atölyemiz",
    body: "Perakende ve toptan siparişler Beşiktaş'taki atölyemizde üretilir.",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli ödeme",
    body: "Ödemeler 3D Secure doğrulamasıyla, lisanslı ödeme altyapısı üzerinden alınır.",
  },
];

export function TrustRow() {
  return (
    <section className="border-b border-border/60 bg-muted/30">
      <ul className="adjy-container grid gap-x-8 gap-y-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {MADDELER.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <h2 className="text-sm font-medium tracking-tight">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
