import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanim Sartlari",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Kullanim Sartlari</h1>
      <div className="prose prose-sm prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Genel Hukumler</h2>
          <p>Bu web sitesini kullanarak asagidaki sartlari kabul etmis sayilirsiniz. ADJY, bu sartlari onceden bildirimde bulunmaksizin degistirme hakkini sakli tutar.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Hizmet Tanimi</h2>
          <p>ADJY, 3D baski teknolojisi ile uretilen ozel tasarim urunlerin satis platformudur. Kullanicilar parametrik ozellestirme yaparak benzersiz urunler siparis edebilir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Siparis ve Odeme</h2>
          <p>Tum siparisler onay sonrasi uretime alinir. Odeme islemi iyzico guvenli odeme altyapisi uzerinden gerceklestirilir. Siparis tutari, urun fiyati, kargo ucreti ve varsa indirim tutarini icerir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Iade ve Iptal</h2>
          <p>Standart urunlerde teslim tarihinden itibaren 14 gun icerisinde iade talebinde bulunulabilir. Ozel tasarim (parametrik) urunlerde iade kabul edilmemektedir. Siparis baskiya girmeden once iptal edilebilir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Fikri Mulkiyet</h2>
          <p>Platform uzerindeki tum icerik, tasarim, logo ve 3D modeller ADJY&apos;nin mulkiyetindedir. Izinsiz kopyalanmasi veya dagitilmasi yasaktir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Sorumluluk Sinirlamasi</h2>
          <p>ADJY, platform uzerinden satilan urunlerin amacina uygun kullanimi konusunda sorumluluk kabul etmez. Urunlerin baski kalitesi ve malzeme ozellikleri urun sayfasinda belirtildigi gibidir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Uyusmazlik Cozumu</h2>
          <p>Bu sartlardan dogan uyusmazliklarda Istanbul Mahkemeleri ve Icra Daireleri yetkilidir.</p>
        </section>

        <p className="text-xs">Son guncelleme: Mart 2026</p>
      </div>
    </div>
  );
}
