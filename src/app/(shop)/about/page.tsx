import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hakkimizda",
  description: "ADJY - Turkiye'nin ilk parametrik 3D baski e-ticaret platformu hakkinda bilgi edinin.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Hakkimizda</h1>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Biz Kimiz?</h2>
          <p>
            ADJY, 3D baski teknolojisini herkes icin erisilebilir kilmayi hedefleyen bir e-ticaret
            platformudur. Parametrik tasarim ve arttirilmis gerceklik (AR) teknolojileri ile
            kullanicilara benzersiz urunler sunuyoruz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Misyonumuz</h2>
          <p>
            Urunleri ihtiyaciniza gore ozellestirmenize olanak taniyan, yenilikci bir alisveris
            deneyimi sunmak. Her urun, sizin parametrelerinize gore uretilir ve kapiiniza kadar
            ulastirilir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Neden ADJY?</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Parametrik ozellestirme ile benzersiz urunler</li>
            <li>AR teknolojisi ile urunu satin almadan once goruntuleme</li>
            <li>Yuksek kaliteli 3D baski malzemeleri (PLA, ABS, PETG, Resin)</li>
            <li>Hizli uretim ve guvenilir kargo</li>
            <li>Kalite kontrol sureci ile garantili urunler</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Uretim Surecimiz</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { step: "1", title: "Tasarim", desc: "Parametrik modelinizi ozellestirin" },
              { step: "2", title: "Baski", desc: "Profesyonel 3D yazicilarla uretin" },
              { step: "3", title: "Kalite Kontrol", desc: "Her urun titizlikle kontrol edilir" },
              { step: "4", title: "Teslimat", desc: "Guvenli paketleme ile kapiiniza" },
            ].map((item) => (
              <div key={item.step} className="bg-card border border-border/40 rounded-xl p-4">
                <div className="text-2xl font-bold text-primary mb-1">{item.step}</div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
