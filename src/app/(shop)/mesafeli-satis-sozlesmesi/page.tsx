import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LegalNote } from "@/components/legal/LegalPage";
import { COMPANY, formatAddress, sellerName } from "@/lib/company";

export const metadata: Metadata = pageMetadata({
  title: "Mesafeli Satış Sözleşmesi",
  description:
    "ADJY mesafeli satış sözleşmesi. Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında düzenlenmiştir.",
  path: "/mesafeli-satis-sozlesmesi",
});

export default function MesafeliSatisSozlesmesiPage() {
  return (
    <LegalPage
      current="/mesafeli-satis-sozlesmesi"
      title="Mesafeli Satış Sözleşmesi"
      sectionLabel="Madde"
      intro="6502 Sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında hazırlanmıştır."
    >

      <section>
        <h2>Taraflar</h2>
        <p>
          <strong>Satıcı:</strong> {sellerName()}
          {COMPANY.address ? ` — ${formatAddress(COMPANY.address)}` : ""}
        </p>
        {COMPANY.phone && (
          <p><strong>Telefon:</strong> {COMPANY.phone}</p>
        )}
        {COMPANY.email && (
          <p><strong>E-posta:</strong> {COMPANY.email}</p>
        )}
        <p><strong>Alıcı:</strong> Sipariş esnasında kayıt edilen müşteri bilgileri.</p>
      </section>

      <section>
        <h2>Konu</h2>
        <p>
          Bu sözleşme, Alıcı’nın ADJY web sitesi üzerinden elektronik ortamda sipariş verdiği ürünlerin satışı
          ve teslimatına ilişkin tarafların hak ve yükümlülüklerini düzenlemektedir.
        </p>
      </section>

      <section>
        <h2>Ürün Bilgileri ve Fiyat</h2>
        <p>
          Ürünün temel özellikleri, satış fiyatı (KDV dahil), ödeme şekli ve teslimat bilgileri sipariş
          özeti ekranında ve onay e-postasında yer almaktadır. Ürün fiyatları kampanya süreleri dışında
          değiştirilebilir; sipariş anındaki fiyat geçerlidir.
        </p>
      </section>

      <section>
        <h2>Ödeme</h2>
        <p>
          Ödeme, iyzico güvenli ödeme altyapısı üzerinden kredi kartı veya banka kartıyla gerçekleştirilir.
          Kart bilgileri ADJY sunucularında saklanmaz. Sipariş tutarı, ürün fiyatı ve kargo ücretinin
          toplamından oluşur.
        </p>
      </section>

      <section>
        <h2>Teslimat</h2>
        <p>
          Ürünler, siparişin onaylanmasının ardından 3D baskı sürecine alınır. Baskı ve kalite kontrol
          aşaması tamamlandıktan sonra kargoya verilir. Teslimat süresi genellikle 5–10 iş günüdür;
          yoğunluk dönemlerinde bu süre uzayabilir. Teslimat adresi, sipariş sırasında belirtilen adrestir.
        </p>
      </section>

      <section>
        <h2>Cayma Hakkı</h2>
        <p>
          Alıcı, teslim tarihinden itibaren <strong>14 gün</strong> içinde
          herhangi bir gerekçe göstermeksizin cayma hakkını kullanabilir. Cayma bildirimini{" "}
          <a href="/contact">iletişim sayfamız</a>{" "}
          aracılığıyla yapabilirsiniz.
        </p>
        <LegalNote>
          <strong>İstisna:</strong> Alıcının özel ölçü, renk veya parametrelerle kişiselleştirdiği ürünler,
          Mesafeli Sözleşmeler Yönetmeliği’nin 15/1-c maddesi uyarınca cayma hakkı kapsamı dışındadır.
        </LegalNote>
      </section>

      <section>
        <h2>İade ve Değişim</h2>
        <p>
          Cayma hakkı kullanılan ürünler, iade kargosunun Alıcı tarafından karşılanması koşuluyla
          kabul edilir. Ürün, kutusu ve tüm aksesuarlarıyla eksiksiz iade edilmelidir. İade onayından
          itibaren 14 gün içinde ödeme iade edilir. Ayrıntılar için{" "}
          <a href="/iade-politikasi">İade ve Değişim Politikası</a>{" "}
          sayfasını inceleyiniz.
        </p>
      </section>

      <section>
        <h2>Uyuşmazlık Çözümü</h2>
        <p>
          Bu sözleşmeden doğan uyuşmazlıklarda Tüketici Mahkemeleri ve Tüketici Hakem Heyetleri yetkilidir.
          Değeri 3.000 TL’nin altındaki uyuşmazlıklarda ilçe, üzerindekiler için il Tüketici Hakem
          Heyeti’ne başvurulabilir.
        </p>
      </section>

      <section>
        <h2>Yürürlük</h2>
        <p>
          Alıcı, sipariş esnasında bu sözleşmeyi onayladığında taraflar arasında bağlayıcı hale gelir.
        </p>
      </section>

    </LegalPage>
  );
}
