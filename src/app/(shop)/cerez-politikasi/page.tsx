import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çerez Politikası | ADJY",
  description: "ADJY çerez politikası. Hangi çerezleri kullandığımız ve nasıl yönetebileceğiniz hakkında bilgi.",
};

export default function CerezPolitikasiPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Çerez Politikası</h1>
      <p className="text-sm text-muted-foreground mb-8">Son güncelleme: Mayıs 2026</p>

      <div className="prose prose-sm prose-invert max-w-none space-y-8 text-muted-foreground">

        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Çerez Nedir?</h2>
          <p>
            Çerezler, web sitelerinin ziyaretçi cihazlarına (bilgisayar, tablet, akıllı telefon) yerleştirdiği
            küçük metin dosyalarıdır. Çerezler, oturum yönetimi, site işlevselliği ve kullanıcı deneyimini
            iyileştirme gibi amaçlarla kullanılmaktadır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Kullandığımız Çerez Türleri</h2>

          <div className="mt-3 space-y-4">
            <div className="border border-border/40 rounded-lg p-4">
              <h3 className="font-medium text-foreground mb-1">Zorunlu Çerezler</h3>
              <p className="text-xs">
                Sitenin düzgün çalışması için gereklidir. Oturum yönetimi, sepet bilgileri ve güvenlik
                doğrulaması bu kapsamda değerlendirilir. Bu çerezler rıza olmaksızın kullanılır.
              </p>
            </div>
            <div className="border border-border/40 rounded-lg p-4">
              <h3 className="font-medium text-foreground mb-1">İşlevsel Çerezler</h3>
              <p className="text-xs">
                Dil tercihi, tema seçimi ve kullanıcı tercihlerini hatırlamak için kullanılır.
              </p>
            </div>
            <div className="border border-border/40 rounded-lg p-4">
              <h3 className="font-medium text-foreground mb-1">Analitik Çerezler</h3>
              <p className="text-xs">
                Siteyi kaç kişinin ziyaret ettiğini, hangi sayfaların daha çok görüntülendiğini ve
                kullanıcıların nasıl gezindiğini anlamamıza yardımcı olur (Google Analytics vb.).
                Bu çerezler için rızanız alınmaktadır.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Çerezlerin Yönetimi</h2>
          <p>
            Çerez tercihlerinizi tarayıcı ayarlarınızdan yönetebilirsiniz. Zorunlu olmayan çerezlere
            verdiğiniz onayı dilediğiniz zaman geri alabilirsiniz. Çerezleri devre dışı bırakmanız
            durumunda bazı site özellikleri (sepet, oturum vb.) düzgün çalışmayabilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Üçüncü Taraf Çerezleri</h2>
          <p>
            Sitemizde iyzico (ödeme), Google Analytics (istatistik) gibi üçüncü taraf hizmet sağlayıcılara
            ait çerezler de yer alabilmektedir. Bu çerezler ilgili hizmet sağlayıcıların politikaları
            kapsamındadır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. İletişim</h2>
          <p>
            Çerez politikamıza ilişkin sorularınız için{" "}
            <a href="/contact" className="text-primary hover:underline">iletişim sayfamız</a>{" "}
            aracılığıyla bize ulaşabilirsiniz.
          </p>
        </section>

      </div>
    </div>
  );
}
