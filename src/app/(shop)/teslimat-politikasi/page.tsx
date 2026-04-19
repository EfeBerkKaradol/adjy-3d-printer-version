import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teslimat Politikası | ADJY",
  description: "ADJY 3D baskı ürünleri kargo, teslimat süresi ve gönderim bilgileri.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Teslimat Politikası</h1>
      <p className="text-sm text-muted-foreground mb-8">Son güncelleme: Nisan 2026</p>

      <div className="prose prose-sm prose-invert max-w-none space-y-8 text-muted-foreground">

        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Üretim Süresi</h2>
          <p>
            Siparişiniz onaylandıktan sonra 3D baskı süreci başlar. Üretim süresi ürüne göre değişir:
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-foreground">Ürün Kategorisi</th>
                  <th className="text-left py-2 font-medium text-foreground">Tahmini Üretim Süresi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-2 pr-4">Anahtarlık, Küçük Aksesuar</td><td className="py-2">1–2 iş günü</td></tr>
                <tr><td className="py-2 pr-4">Vazo, Stand, Kalem Kutusu</td><td className="py-2">2–3 iş günü</td></tr>
                <tr><td className="py-2 pr-4">Figür, Dekoratif Ürün</td><td className="py-2">3–5 iş günü</td></tr>
                <tr><td className="py-2 pr-4">Masa Lambası, Büyük Ürün</td><td className="py-2">4–7 iş günü</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">Sipariş onayı e-postanızda tahmini teslim tarihi belirtilir.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Kargo ve Teslimat</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong className="text-foreground">Kargo firması:</strong> Yurtiçi Kargo — Türkiye&apos;nin her noktasına teslimat.
            </li>
            <li>
              <strong className="text-foreground">Standart teslimat:</strong> Kargo çıkışından itibaren 1–3 iş günü.
            </li>
            <li>
              <strong className="text-foreground">Ücretsiz kargo:</strong> 500 TL ve üzeri siparişlerde kargo ücretsizdir.
            </li>
            <li>
              <strong className="text-foreground">Kargo ücreti:</strong> 500 TL altı siparişlerde sabit 29,90 TL kargo ücreti uygulanır.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Kargo Takibi</h2>
          <p>
            Ürününüz kargoya verildiğinde e-posta ile bildirim alırsınız. Kargo takip numaranızla
            Yurtiçi Kargo web sitesinden veya hesabınızdaki{" "}
            <Link href="/profile/orders" className="underline hover:text-foreground">Siparişlerim</Link>{" "}
            bölümünden takip yapabilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Teslimat Adresi</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Sipariş tamamlandıktan sonra teslimat adresi değiştirilemez.</li>
            <li>Yanlış adres girişinden kaynaklanan teslimat sorunlarında sorumluluk alıcıya aittir.</li>
            <li>Adres değişikliği için kargo çıkmadan önce mutlaka bizimle iletişime geçin.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Uluslararası Teslimat</h2>
          <p>
            Şu an yalnızca <strong className="text-foreground">Türkiye</strong> içi teslimat yapılmaktadır.
            Yurt dışı gönderim için lütfen <Link href="/contact" className="underline hover:text-foreground">bizimle iletişime geçin</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Hasarlı veya Kayıp Kargo</h2>
          <p>
            Kargo hasarlı teslim edildiyse teslim tutanağına şerh düşürün ve 3 gün içinde
            fotoğraflarla birlikte{" "}
            <a href="mailto:destek@adjy.com" className="underline hover:text-foreground">destek@adjy.com</a>
            {" "}adresine bildirin. Kargo kayıpları için kargo firmasıyla birlikte hasar tutanağı açılır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. İletişim</h2>
          <p>
            Teslimat sorularınız için:{" "}
            <a href="mailto:destek@adjy.com" className="underline hover:text-foreground">destek@adjy.com</a>
            {" "}veya <Link href="/contact" className="underline hover:text-foreground">İletişim Formu</Link>
          </p>
        </section>

      </div>
    </div>
  );
}
