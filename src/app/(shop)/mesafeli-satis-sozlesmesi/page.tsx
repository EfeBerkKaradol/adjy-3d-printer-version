import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi | ADJY",
  description: "ADJY mesafeli satış sözleşmesi. Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında düzenlenmiştir.",
};

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Mesafeli Satış Sözleşmesi</h1>
      <p className="text-sm text-muted-foreground mb-8">
        6502 Sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında hazırlanmıştır.
      </p>

      <div className="prose prose-sm prose-invert max-w-none space-y-8 text-muted-foreground">

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 1 — Taraflar</h2>
          <p><strong className="text-foreground">Satıcı:</strong> ADJY — 3D Baskı E-Ticaret Platformu</p>
          <p><strong className="text-foreground">Alıcı:</strong> Sipariş esnasında kayıt edilen müşteri bilgileri.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 2 — Konu</h2>
          <p>
            Bu sözleşme, Alıcı'nın ADJY web sitesi üzerinden elektronik ortamda sipariş verdiği ürünlerin satışı
            ve teslimatına ilişkin tarafların hak ve yükümlülüklerini düzenlemektedir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 3 — Ürün Bilgileri ve Fiyat</h2>
          <p>
            Ürünün temel özellikleri, satış fiyatı (KDV dahil), ödeme şekli ve teslimat bilgileri sipariş
            özeti ekranında ve onay e-postasında yer almaktadır. Ürün fiyatları kampanya süreleri dışında
            değiştirilebilir; sipariş anındaki fiyat geçerlidir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 4 — Ödeme</h2>
          <p>
            Ödeme, iyzico güvenli ödeme altyapısı üzerinden kredi kartı veya banka kartıyla gerçekleştirilir.
            Kart bilgileri ADJY sunucularında saklanmaz. Sipariş tutarı, ürün fiyatı ve kargo ücretinin
            toplamından oluşur.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 5 — Teslimat</h2>
          <p>
            Ürünler, siparişin onaylanmasının ardından 3D baskı sürecine alınır. Baskı ve kalite kontrol
            aşaması tamamlandıktan sonra kargoya verilir. Teslimat süresi genellikle 5–10 iş günüdür;
            yoğunluk dönemlerinde bu süre uzayabilir. Teslimat adresi, sipariş sırasında belirtilen adrestir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 6 — Cayma Hakkı</h2>
          <p>
            Alıcı, teslim tarihinden itibaren <strong className="text-foreground">14 gün</strong> içinde
            herhangi bir gerekçe göstermeksizin cayma hakkını kullanabilir. Cayma bildirimini{" "}
            <a href="/contact" className="text-primary hover:underline">iletişim sayfamız</a>{" "}
            aracılığıyla yapabilirsiniz.
          </p>
          <p className="mt-2 text-amber-500/80 font-medium">
            ⚠ İstisna: Alıcının özel ölçü, renk veya parametrelerle kişiselleştirdiği ürünler,
            Mesafeli Sözleşmeler Yönetmeliği'nin 15/1-c maddesi uyarınca cayma hakkı kapsamı dışındadır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 7 — İade ve Değişim</h2>
          <p>
            Cayma hakkı kullanılan ürünler, iade kargosunun Alıcı tarafından karşılanması koşuluyla
            kabul edilir. Ürün, kutusu ve tüm aksesuarlarıyla eksiksiz iade edilmelidir. İade onayından
            itibaren 14 gün içinde ödeme iade edilir. Ayrıntılar için{" "}
            <a href="/iade-politikasi" className="text-primary hover:underline">İade ve Değişim Politikası</a>{" "}
            sayfasını inceleyiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 8 — Uyuşmazlık Çözümü</h2>
          <p>
            Bu sözleşmeden doğan uyuşmazlıklarda Tüketici Mahkemeleri ve Tüketici Hakem Heyetleri yetkilidir.
            Değeri 3.000 TL'nin altındaki uyuşmazlıklarda ilçe, üzerindekiler için il Tüketici Hakem
            Heyeti'ne başvurulabilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Madde 9 — Yürürlük</h2>
          <p>
            Alıcı, sipariş esnasında bu sözleşmeyi onayladığında taraflar arasında bağlayıcı hale gelir.
          </p>
        </section>

      </div>
    </div>
  );
}
