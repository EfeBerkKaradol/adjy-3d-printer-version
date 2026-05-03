import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu | ADJY",
  description: "ADJY ön bilgilendirme formu. Ürün, fiyat, teslimat ve cayma hakkına ilişkin bilgileri içerir.",
};

export default function OnBilgilendirmePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Ön Bilgilendirme Formu</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Mesafeli Sözleşmeler Yönetmeliği'nin 5. maddesi uyarınca satın alma öncesi tüketicinin
        bilgilendirilmesi amacıyla hazırlanmıştır.
      </p>

      <div className="prose prose-sm prose-invert max-w-none space-y-8 text-muted-foreground">

        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Satıcı Bilgileri</h2>
          <p><strong className="text-foreground">Ticaret Unvanı:</strong> ADJY</p>
          <p><strong className="text-foreground">Web Sitesi:</strong> adjy.com</p>
          <p>
            <strong className="text-foreground">İletişim:</strong>{" "}
            <a href="/contact" className="text-primary hover:underline">İletişim Formu</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Sözleşme Konusu Ürün</h2>
          <p>
            Sipariş verilen ürüne ilişkin temel özellikler (ürün adı, boyutlar, renk, malzeme türü ve
            özelleştirme parametreleri) ürün sayfasında ve sipariş özeti ekranında ayrıntılı olarak
            gösterilmektedir. Ürünler 3D baskı teknolojisiyle PLA veya diğer uyumlu malzemelerle üretilmektedir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Satış Fiyatı ve Ödeme</h2>
          <p>
            Ürün fiyatı KDV dahil olmak üzere sipariş özeti sayfasında gösterilmektedir. Kargo ücreti
            ayrıca hesaplanmakta ve ödeme adımında belirtilmektedir. Ödeme; iyzico güvenli ödeme altyapısı
            aracılığıyla kredi kartı veya banka kartıyla peşin olarak gerçekleştirilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Teslimat Bilgileri</h2>
          <p>
            Ürünler, sipariş onayından sonra 3D baskı sürecine alınır. Tahmini teslimat süresi
            <strong className="text-foreground"> 5–10 iş günüdür</strong>. Ürün, sipariş sırasında
            belirtilen adrese kargo yoluyla teslim edilir. Kargoya verilmesinin ardından takip numarası
            e-posta ile bildirilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Cayma Hakkı</h2>
          <p>
            Tüketici, teslimat tarihinden itibaren <strong className="text-foreground">14 gün</strong> içinde
            herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
          </p>
          <p className="mt-2">
            Cayma hakkını kullanmak için{" "}
            <a href="/contact" className="text-primary hover:underline">iletişim sayfamız</a>{" "}
            üzerinden bildirimde bulunulması yeterlidir.
          </p>
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-500/90 font-medium">
              ⚠ İstisna: Alıcının talepleri doğrultusunda kişiselleştirilerek (renk, boyut, parametre)
              üretilen ürünler cayma hakkı kapsamı dışındadır (Mesafeli Sözleşmeler Yönetmeliği md. 15/1-c).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. İade Süreci</h2>
          <p>
            Cayma hakkı kullanıldığında ürünün Satıcı'ya ulaşmasından itibaren en geç 14 gün içinde
            ödeme iade edilir. İade kargo bedeli Alıcı tarafından karşılanır. Ayrıntılar için{" "}
            <a href="/iade-politikasi" className="text-primary hover:underline">İade Politikası</a>{" "}
            sayfasını inceleyiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Şikayet ve Uyuşmazlık</h2>
          <p>
            Uyuşmazlık durumunda Tüketici Hakem Heyeti veya Tüketici Mahkemeleri'ne başvurulabilir.
            Şikayetlerinizi{" "}
            <a href="/contact" className="text-primary hover:underline">iletişim formu</a>{" "}
            aracılığıyla da iletebilirsiniz.
          </p>
        </section>

      </div>
    </div>
  );
}
