import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Çerez Politikası",
  description:
    "ADJY çerez politikası. Hangi çerezleri kullandığımız ve nasıl yönetebileceğiniz hakkında bilgi.",
  path: "/cerez-politikasi",
});

export default function CerezPolitikasiPage() {
  return (
    <LegalPage
      current="/cerez-politikasi"
      title="Çerez Politikası"
      updated="Mayıs 2026"
    >

      <section>
        <h2>Çerez Nedir?</h2>
        <p>
          Çerezler, web sitelerinin ziyaretçi cihazlarına (bilgisayar, tablet, akıllı telefon) yerleştirdiği
          küçük metin dosyalarıdır. Çerezler, oturum yönetimi, site işlevselliği ve kullanıcı deneyimini
          iyileştirme gibi amaçlarla kullanılmaktadır.
        </p>
      </section>

      <section>
        <h2>Kullandığımız Çerez Türleri</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="adjy-pixel-card p-4">
            <h3>Zorunlu Çerezler</h3>
            <p className="text-sm">
              Sitenin düzgün çalışması için gereklidir. Oturum yönetimi, sepet bilgileri ve güvenlik
              doğrulaması bu kapsamda değerlendirilir. Bu çerezler rıza olmaksızın kullanılır.
            </p>
          </div>
          <div className="adjy-pixel-card p-4">
            <h3>İşlevsel Çerezler</h3>
            <p className="text-sm">
              Dil tercihi, tema seçimi ve kullanıcı tercihlerini hatırlamak için kullanılır.
            </p>
          </div>
          <div className="adjy-pixel-card p-4">
            <h3>Analitik Çerezler</h3>
            <p className="text-sm">
              Siteyi kaç kişinin ziyaret ettiğini, hangi sayfaların daha çok görüntülendiğini ve
              kullanıcıların nasıl gezindiğini anlamamıza yardımcı olur (Google Analytics vb.).
              Bu çerezler için rızanız alınmaktadır.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2>Çerezlerin Yönetimi</h2>
        <p>
          Çerez tercihlerinizi tarayıcı ayarlarınızdan yönetebilirsiniz. Zorunlu olmayan çerezlere
          verdiğiniz onayı dilediğiniz zaman geri alabilirsiniz. Çerezleri devre dışı bırakmanız
          durumunda bazı site özellikleri (sepet, oturum vb.) düzgün çalışmayabilir.
        </p>
      </section>

      <section>
        <h2>Üçüncü Taraf Çerezleri</h2>
        <p>
          Sitemizde iyzico (ödeme), Google Analytics (istatistik) gibi üçüncü taraf hizmet sağlayıcılara
          ait çerezler de yer alabilmektedir. Bu çerezler ilgili hizmet sağlayıcıların politikaları
          kapsamındadır.
        </p>
      </section>

      <section>
        <h2>İletişim</h2>
        <p>
          Çerez politikamıza ilişkin sorularınız için{" "}
          <a href="/contact">iletişim sayfamız</a>{" "}
          aracılığıyla bize ulaşabilirsiniz.
        </p>
      </section>

    </LegalPage>
  );
}
