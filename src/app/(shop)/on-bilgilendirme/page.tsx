import type { Metadata } from "next";
import { LegalPage, LegalNote } from "@/components/legal/LegalPage";
import { COMPANY, formatAddress, sellerName } from "@/lib/company";

export const metadata: Metadata = {
  title: "Ön Bilgilendirme Formu",
  description: "ADJY ön bilgilendirme formu. Ürün, fiyat, teslimat ve cayma hakkına ilişkin bilgileri içerir.",
};

export default function OnBilgilendirmePage() {
  return (
    <LegalPage
      current="/on-bilgilendirme"
      title="Ön Bilgilendirme Formu"
      intro="Mesafeli Sözleşmeler Yönetmeliği’nin 5. maddesi uyarınca satın alma öncesi tüketicinin bilgilendirilmesi amacıyla hazırlanmıştır."
    >

      <section>
        <h2>Satıcı Bilgileri</h2>
        <p>
          <strong>Ticaret Unvanı:</strong> {sellerName()}
        </p>
        {COMPANY.address && (
          <p>
            <strong>Adres:</strong>{" "}
            {formatAddress(COMPANY.address)}
          </p>
        )}
        {COMPANY.phone && (
          <p>
            <strong>Telefon:</strong> {COMPANY.phone}
          </p>
        )}
        {COMPANY.email && (
          <p>
            <strong>E-posta:</strong> {COMPANY.email}
          </p>
        )}
        {COMPANY.mersisNumber && (
          <p>
            <strong>MERSİS No:</strong> {COMPANY.mersisNumber}
          </p>
        )}
        {COMPANY.taxOffice && COMPANY.taxNumber && (
          <p>
            <strong>Vergi Dairesi / No:</strong>{" "}
            {COMPANY.taxOffice} / {COMPANY.taxNumber}
          </p>
        )}
        <p>
          <strong>Web Sitesi:</strong> {COMPANY.website}
        </p>
        <p>
          <strong>İletişim:</strong>{" "}
          <a href="/contact">İletişim Formu</a>
        </p>
      </section>

      <section>
        <h2>Sözleşme Konusu Ürün</h2>
        <p>
          Sipariş verilen ürüne ilişkin temel özellikler (ürün adı, boyutlar, renk, malzeme türü ve
          özelleştirme parametreleri) ürün sayfasında ve sipariş özeti ekranında ayrıntılı olarak
          gösterilmektedir. Ürünler, nesneye göre 3D baskı (PLA, PETG, ABS ve benzeri), seramik veya alçı ile üretilmektedir.
        </p>
      </section>

      <section>
        <h2>Satış Fiyatı ve Ödeme</h2>
        <p>
          Ürün fiyatı KDV dahil olmak üzere sipariş özeti sayfasında gösterilmektedir. Kargo ücreti
          ayrıca hesaplanmakta ve ödeme adımında belirtilmektedir. Ödeme; iyzico güvenli ödeme altyapısı
          aracılığıyla kredi kartı veya banka kartıyla peşin olarak gerçekleştirilir.
        </p>
      </section>

      <section>
        <h2>Teslimat Bilgileri</h2>
        <p>
          Ürünler, sipariş onayından sonra 3D baskı sürecine alınır. Tahmini teslimat süresi
          <strong> 5–10 iş günüdür</strong>. Ürün, sipariş sırasında
          belirtilen adrese kargo yoluyla teslim edilir. Kargoya verilmesinin ardından takip numarası
          e-posta ile bildirilir.
        </p>
      </section>

      <section>
        <h2>Cayma Hakkı</h2>
        <p>
          Tüketici, teslimat tarihinden itibaren <strong>14 gün</strong> içinde
          herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
        </p>
        <p>
          Cayma hakkını kullanmak için{" "}
          <a href="/contact">iletişim sayfamız</a>{" "}
          üzerinden bildirimde bulunulması yeterlidir.
        </p>
        <LegalNote>
          <strong>İstisna:</strong> Alıcının talepleri doğrultusunda kişiselleştirilerek (renk, boyut, parametre)
          üretilen ürünler cayma hakkı kapsamı dışındadır (Mesafeli Sözleşmeler Yönetmeliği md. 15/1-c).
        </LegalNote>
      </section>

      <section>
        <h2>İade Süreci</h2>
        <p>
          Cayma hakkı kullanıldığında ürünün Satıcı’ya ulaşmasından itibaren en geç 14 gün içinde
          ödeme iade edilir. İade kargo bedeli Alıcı tarafından karşılanır. Ayrıntılar için{" "}
          <a href="/iade-politikasi">İade Politikası</a>{" "}
          sayfasını inceleyiniz.
        </p>
      </section>

      <section>
        <h2>Şikayet ve Uyuşmazlık</h2>
        <p>
          Uyuşmazlık durumunda Tüketici Hakem Heyeti veya Tüketici Mahkemeleri’ne başvurulabilir.
          Şikayetlerinizi{" "}
          <a href="/contact">iletişim formu</a>{" "}
          aracılığıyla da iletebilirsiniz.
        </p>
      </section>

    </LegalPage>
  );
}
