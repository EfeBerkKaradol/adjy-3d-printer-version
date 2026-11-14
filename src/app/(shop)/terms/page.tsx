import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Kullanım Şartları",
  description:
    "adjyshopping.com'u kullanırken geçerli olan şartlar.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage current="/terms" title="Kullanım Şartları" updated="Mart 2026">
      <section>
        <h2>Genel Hükümler</h2>
        <p>
          Bu web sitesini kullanarak aşağıdaki şartları kabul etmiş sayılırsınız. ADJY, bu şartları
          önceden bildirimde bulunmaksızın değiştirme hakkını saklı tutar.
        </p>
      </section>

      <section>
        <h2>Hizmet Tanımı</h2>
        <p>
          ADJY, 3D baskı teknolojisi ile üretilen özel tasarım ürünlerin satış platformudur.
          Kullanıcılar parametrik özelleştirme yaparak benzersiz ürünler sipariş edebilir.
        </p>
      </section>

      <section>
        <h2>Sipariş ve Ödeme</h2>
        <p>
          Tüm siparişler onay sonrası üretime alınır. Ödeme işlemi iyzico güvenli ödeme altyapısı
          üzerinden gerçekleştirilir. Sipariş tutarı, ürün fiyatı, kargo ücreti ve varsa indirim
          tutarını içerir.
        </p>
      </section>

      <section>
        <h2>İade ve İptal</h2>
        <p>
          Standart ürünlerde teslim tarihinden itibaren 14 gün içerisinde iade talebinde bulunulabilir.
          Özel tasarım (parametrik) ürünlerde iade kabul edilmemektedir. Sipariş baskıya girmeden önce
          iptal edilebilir. Ayrıntılar için <a href="/iade-politikasi">İade ve İptal Politikası</a>{" "}
          sayfasına bakın.
        </p>
      </section>

      <section>
        <h2>Fikri Mülkiyet</h2>
        <p>
          Platform üzerindeki tüm içerik, tasarım, logo ve 3D modeller ADJY&apos;nin mülkiyetindedir.
          İzinsiz kopyalanması veya dağıtılması yasaktır.
        </p>
      </section>

      <section>
        <h2>Sorumluluk Sınırlaması</h2>
        <p>
          ADJY, platform üzerinden satılan ürünlerin amacına uygun kullanımı konusunda sorumluluk kabul
          etmez. Ürünlerin baskı kalitesi ve malzeme özellikleri ürün sayfasında belirtildiği gibidir.
        </p>
      </section>

      <section>
        <h2>Uyuşmazlık Çözümü</h2>
        <p>Bu şartlardan doğan uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</p>
      </section>
    </LegalPage>
  );
}
