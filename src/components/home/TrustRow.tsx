import { Ruler, Scan, Hammer, ShieldCheck } from "lucide-react";

// ==========================================
// GÜVEN ŞERİDİ
//
// Tanınmayan bir mağazada ilk soru "bunlar kim?" oluyor.
// Dört kısa cevap, ürünlerin hemen üstünde: hepsi sitede
// gerçekten karşılığı olan şeyler, süs değil.
// ==========================================

const MADDELER = [
  {
    icon: Ruler,
    title: "Ölçüsü sana göre",
    body: "Çoğu nesnenin enini ve boyunu kendi alanına göre ayarla.",
  },
  {
    icon: Scan,
    title: "Almadan önce gör",
    body: "Telefonunla kendi odanda, gerçek ölçüsünde görüntüle.",
  },
  {
    icon: Hammer,
    title: "Kendi atölyemiz",
    body: "3D baskı, seramik ve alçı — tek parçalık sipariş de yapılır.",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli ödeme",
    body: "Kart bilgin bize ulaşmaz; 14 gün içinde cayma hakkın var.",
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
