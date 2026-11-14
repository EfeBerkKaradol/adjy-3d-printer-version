import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "ADJY 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin işlenmesine ilişkin aydınlatma metni.",
};

export default function KVKKPage() {
  return (
    <LegalPage
      current="/kvkk"
      title="KVKK Aydınlatma Metni"
      intro="6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında hazırlanmıştır."
      updated="Mayıs 2026"
    >

      <section>
        <h2>Veri Sorumlusunun Kimliği</h2>
        <p>
          ADJY (“Şirket”), 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca veri sorumlusu
          sıfatıyla, kişisel verilerinizi aşağıda açıklanan amaçlar kapsamında işlemektedir.
        </p>
      </section>

      <section>
        <h2>İşlenen Kişisel Veriler</h2>
        <ul>
          <li>Kimlik bilgileri: Ad, soyad</li>
          <li>İletişim bilgileri: E-posta adresi, telefon numarası, adres</li>
          <li>Müşteri işlem bilgileri: Sipariş geçmişi, ödeme bilgileri (kart numarası saklanmaz)</li>
          <li>İşlem güvenliği bilgileri: IP adresi, çerez verileri, oturum bilgileri</li>
          <li>Talep/şikayet bilgileri: İletişim formları aracılığıyla iletilen bilgiler</li>
        </ul>
      </section>

      <section>
        <h2>Kişisel Verilerin İşlenme Amaçları</h2>
        <ul>
          <li>Sipariş ve satış süreçlerinin yürütülmesi</li>
          <li>Kargo ve teslimat süreçlerinin takibi</li>
          <li>Müşteri hizmetleri ve destek taleplerinin karşılanması</li>
          <li>Ödeme işlemlerinin gerçekleştirilmesi ve doğrulanması</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          <li>Site güvenliğinin sağlanması ve sahteciliğin önlenmesi</li>
          <li>Faturalandırma ve muhasebe işlemleri</li>
        </ul>
      </section>

      <section>
        <h2>Kişisel Verilerin Aktarılması</h2>
        <p>
          Kişisel verileriniz; kargo şirketleri (teslimat amacıyla), ödeme kuruluşu iyzico (ödeme işlemi amacıyla),
          yasal zorunluluk halinde yetkili kamu kurum ve kuruluşları ile paylaşılabilir. Bu aktarımlar KVKK’nın
          8. ve 9. maddeleri kapsamında gerçekleştirilmektedir.
        </p>
      </section>

      <section>
        <h2>Kişisel Veri Toplama Yöntemi ve Hukuki Sebebi</h2>
        <p>
          Kişisel verileriniz; web sitesi, mobil uygulama ve iletişim kanalları aracılığıyla toplanmaktadır.
          İşleme faaliyetleri; sözleşmenin kurulması ve ifası, hukuki yükümlülük ve açık rıza hukuki
          sebeplerine dayanmaktadır (KVKK md. 5).
        </p>
      </section>

      <section>
        <h2>Veri Sahibinin Hakları (KVKK md. 11)</h2>
        <p>KVKK’nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse bilgi talep etme</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
          <li>Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
          <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>
          <li>Verilerin silinmesini veya yok edilmesini isteme</li>
          <li>Otomatik sistemler aracılığıyla aleyhine sonuç doğurulmasına itiraz etme</li>
          <li>Zararın giderilmesini talep etme</li>
        </ul>
        <p>
          Bu haklarınızı kullanmak için{" "}
          <a href="/contact">iletişim sayfamız</a>{" "}
          aracılığıyla bize ulaşabilirsiniz.
        </p>
      </section>

      <section>
        <h2>Veri Güvenliği</h2>
        <p>
          Kişisel verileriniz; SSL şifreleme, güvenli sunucular ve erişim kontrolleri ile korunmaktadır.
          Ödeme bilgileri doğrudan iyzico güvenli altyapısı tarafından işlenir, sunucularımızda saklanmaz.
        </p>
      </section>

    </LegalPage>
  );
}
