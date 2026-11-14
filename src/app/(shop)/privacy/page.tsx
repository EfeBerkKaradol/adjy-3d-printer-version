import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Gizlilik Politikası",
  description:
    "ADJY'nin hangi kişisel verileri topladığı, nasıl kullandığı ve nasıl koruduğu.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage current="/privacy" title="Gizlilik Politikası" updated="Mart 2026">
      <section>
        <h2>Toplanan Veriler</h2>
        <p>Hizmetlerimizi sunabilmek için aşağıdaki kişisel verileri topluyoruz:</p>
        <ul>
          <li>Ad, soyad ve iletişim bilgileri</li>
          <li>E-posta adresi ve telefon numarası</li>
          <li>Teslimat ve fatura adresleri</li>
          <li>Sipariş geçmişi ve ödeme bilgileri</li>
          <li>Çerez verileri ve site kullanım istatistikleri</li>
        </ul>
      </section>

      <section>
        <h2>Verilerin Kullanımı</h2>
        <p>Toplanan veriler aşağıdaki amaçlarla kullanılır:</p>
        <ul>
          <li>Sipariş işlemlerinin gerçekleştirilmesi</li>
          <li>Müşteri hizmetleri ve destek</li>
          <li>Ödeme işlemlerinin güvenli şekilde yapılması</li>
          <li>Hizmet kalitesinin iyileştirilmesi</li>
        </ul>
      </section>

      <section>
        <h2>Veri Güvenliği</h2>
        <p>
          Kişisel verileriniz SSL şifreleme, güvenli sunucular ve erişim kontrolleri ile korunmaktadır.
          Ödeme bilgileri doğrudan iyzico güvenli altyapısı tarafından işlenir ve sunucularımızda saklanmaz.
        </p>
      </section>

      <section>
        <h2>Çerezler</h2>
        <p>
          Sitemiz, kullanıcı deneyimini iyileştirmek ve oturum yönetimi için çerezler kullanmaktadır.
          Çerez tercihlerinizi tarayıcı ayarlarından yönetebilirsiniz. Ayrıntılar için{" "}
          <a href="/cerez-politikasi">Çerez Politikası</a> sayfasına bakın.
        </p>
      </section>

      <section>
        <h2>Üçüncü Taraf Paylaşımı</h2>
        <p>
          Kişisel verileriniz, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz. Kargo ve ödeme
          hizmet sağlayıcıları ile yalnızca işlem için gerekli bilgiler paylaşılır.
        </p>
      </section>

      <section>
        <h2>Kullanıcı Hakları</h2>
        <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Verilerinize erişim ve düzeltme talep etme</li>
          <li>Verilerin silinmesini isteme</li>
          <li>Veri işlemesine itiraz etme</li>
          <li>Veri taşınabilirliğini talep etme</li>
        </ul>
      </section>

      <section>
        <h2>İletişim</h2>
        <p>
          Gizlilik ile ilgili sorularınız için <a href="mailto:destek@adjy.com">destek@adjy.com</a>{" "}
          adresinden bize ulaşabilirsiniz.
        </p>
      </section>
    </LegalPage>
  );
}
