import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teslimat Politikası",
  description: "ADJY 3D baskı ürünleri kargo, teslimat süresi ve gönderim bilgileri.",
};

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      current="/teslimat-politikasi"
      title="Teslimat Politikası"
      updated="Nisan 2026"
    >

      <section>
        <h2>Üretim Süresi</h2>
        <p>
          Siparişiniz onaylandıktan sonra 3D baskı süreci başlar. Üretim süresi ürüne göre değişir:
        </p>
        <div className="adjy-pixel-card mt-4 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Ürün Kategorisi</th>
                <th>Tahmini Üretim Süresi</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Anahtarlık, Küçük Aksesuar</td><td className="whitespace-nowrap tabular-nums">1–2 iş günü</td></tr>
              <tr><td>Vazo, Stand, Kalem Kutusu</td><td className="whitespace-nowrap tabular-nums">2–3 iş günü</td></tr>
              <tr><td>Figür, Dekoratif Ürün</td><td className="whitespace-nowrap tabular-nums">3–5 iş günü</td></tr>
              <tr><td>Masa Lambası, Büyük Ürün</td><td className="whitespace-nowrap tabular-nums">4–7 iş günü</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">Sipariş onayı e-postanızda tahmini teslim tarihi belirtilir.</p>
      </section>

      <section>
        <h2>Kargo ve Teslimat</h2>
        <ul>
          <li>
            <strong>Kargo firması:</strong> Yurtiçi Kargo — Türkiye&apos;nin her noktasına teslimat.
          </li>
          <li>
            <strong>Standart teslimat:</strong> Kargo çıkışından itibaren 1–3 iş günü.
          </li>
          <li>
            <strong>Ücretsiz kargo:</strong> 500 TL ve üzeri siparişlerde kargo ücretsizdir.
          </li>
          <li>
            <strong>Kargo ücreti:</strong> 500 TL altı siparişlerde sabit 29,90 TL kargo ücreti uygulanır.
          </li>
        </ul>
      </section>

      <section>
        <h2>Kargo Takibi</h2>
        <p>
          Ürününüz kargoya verildiğinde e-posta ile bildirim alırsınız. Kargo takip numaranızla
          Yurtiçi Kargo web sitesinden veya hesabınızdaki{" "}
          <Link href="/profile/orders">Siparişlerim</Link>{" "}
          bölümünden takip yapabilirsiniz.
        </p>
      </section>

      <section>
        <h2>Teslimat Adresi</h2>
        <ul>
          <li>Sipariş tamamlandıktan sonra teslimat adresi değiştirilemez.</li>
          <li>Yanlış adres girişinden kaynaklanan teslimat sorunlarında sorumluluk alıcıya aittir.</li>
          <li>Adres değişikliği için kargo çıkmadan önce mutlaka bizimle iletişime geçin.</li>
        </ul>
      </section>

      <section>
        <h2>Uluslararası Teslimat</h2>
        <p>
          Şu an yalnızca <strong>Türkiye</strong> içi teslimat yapılmaktadır.
          Yurt dışı gönderim için lütfen <Link href="/contact">bizimle iletişime geçin</Link>.
        </p>
      </section>

      <section>
        <h2>Hasarlı veya Kayıp Kargo</h2>
        <p>
          Kargo hasarlı teslim edildiyse teslim tutanağına şerh düşürün ve 3 gün içinde
          fotoğraflarla birlikte{" "}
          <a href="mailto:destek@adjy.com">destek@adjy.com</a>
          {" "}adresine bildirin. Kargo kayıpları için kargo firmasıyla birlikte hasar tutanağı açılır.
        </p>
      </section>

      <section>
        <h2>İletişim</h2>
        <p>
          Teslimat sorularınız için:{" "}
          <a href="mailto:destek@adjy.com">destek@adjy.com</a>
          {" "}veya <Link href="/contact">İletişim Formu</Link>
        </p>
      </section>

    </LegalPage>
  );
}
