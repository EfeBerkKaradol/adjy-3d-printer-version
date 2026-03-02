import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikasi",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Gizlilik Politikasi</h1>
      <div className="prose prose-sm prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Toplanan Veriler</h2>
          <p>Hizmetlerimizi sunabilmek icin asagidaki kisisel verileri topluyoruz:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Ad, soyad ve iletisim bilgileri</li>
            <li>E-posta adresi ve telefon numarasi</li>
            <li>Teslimat ve fatura adresleri</li>
            <li>Siparis gecmisi ve odeme bilgileri</li>
            <li>Cerez verileri ve site kullanim istatistikleri</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Verilerin Kullanimi</h2>
          <p>Toplanan veriler asagidaki amaclarla kullanilir:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Siparis islemlerinin gerceklestirilmesi</li>
            <li>Musteri hizmetleri ve destek</li>
            <li>Odeme islemlerinin guvenli sekilde yapilmasi</li>
            <li>Hizmet kalitesinin iyilestirilmesi</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Veri Guvenligi</h2>
          <p>Kisisel verileriniz SSL sifreleme, guvenli sunucular ve erisim kontrolleri ile korunmaktadir. Odeme bilgileri dogrudan iyzico guvenli altyapisi tarafindan islenir ve sunucularimizda saklanmaz.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Cerezler</h2>
          <p>Sitemiz, kullanici deneyimini iyilestirmek ve oturum yonetimi icin cerezler kullanmaktadir. Cerez tercihlerinizi tarayici ayarlarindan yonetebilirsiniz.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Ucuncu Taraf Paylasimi</h2>
          <p>Kisisel verileriniz, yasal zorunluluklar disinda ucuncu taraflarla paylasilmaz. Kargo ve odeme hizmet saglayicilari ile yalnizca islem icin gerekli bilgiler paylasilir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Kullanici Haklari</h2>
          <p>KVKK kapsaminda asagidaki haklara sahipsiniz:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Verilerinize erisim ve duzeltme talep etme</li>
            <li>Verilerin silinmesini isteme</li>
            <li>Veri islemesine itiraz etme</li>
            <li>Veri tasinabilirligini talep etme</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Iletisim</h2>
          <p>Gizlilik ile ilgili sorulariniz icin destek@adjy.com adresinden bize ulasabilirsiniz.</p>
        </section>

        <p className="text-xs">Son guncelleme: Mart 2026</p>
      </div>
    </div>
  );
}
