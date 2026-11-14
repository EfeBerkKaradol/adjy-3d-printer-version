import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LegalNote } from "@/components/legal/LegalPage";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "İade ve İptal Politikası",
  description:
    "ADJY 3D baskı ürünleri için iade, iptal ve değişim politikası hakkında bilgi alın.",
  path: "/iade-politikasi",
});

export default function ReturnPolicyPage() {
  return (
    <LegalPage
      current="/iade-politikasi"
      title="İade ve İptal Politikası"
      updated="Nisan 2026"
    >

      <section>
        <h2>Genel Kurallar</h2>
        <p>
          ADJY olarak müşteri memnuniyetini ön planda tutuyoruz. 6502 sayılı Tüketicinin Korunması
          Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamındaki haklarınız saklıdır.
        </p>
      </section>

      <section>
        <h2>İade Hakkı — Standart Ürünler</h2>
        <p>
          Katalogdaki hazır (parametrik olmayan) ürünlerde, ürünü teslim aldığınız tarihten itibaren
          <strong> 14 gün</strong> içinde iade talebinde bulunabilirsiniz.
        </p>
        <ul>
          <li>Ürün kullanılmamış ve orijinal ambalajında olmalıdır.</li>
          <li>Kargo ücreti alıcıya aittir.</li>
          <li>İade kargo adresimiz için <Link href="/contact">İletişim</Link> sayfasını ziyaret edin.</li>
          <li>Onaylanan iadeler 5–10 iş günü içinde ödeme yönteminize iade edilir.</li>
        </ul>
      </section>

      <section>
        <h2>İade Kabul Edilmeyen Durumlar — Özel Tasarım Ürünler</h2>
        <p>
          Parametrik (kişiye özel) olarak üretilen ürünler, Mesafeli Sözleşmeler Yönetmeliği
          Madde 15/1-c uyarınca cayma hakkı kapsamı dışındadır:
        </p>
        <ul>
          <li>Renk, boyut, desen gibi parametrelerle özelleştirilmiş siparişler.</li>
          <li>Baskıya girmiş veya tamamlanmış tüm özel üretimler.</li>
        </ul>
        <LegalNote>
          <strong>İstisna:</strong> Üretim hatası veya baskı kalitesi sorunu tespit edilirse, ürün ücretsiz yeniden baskı ile değiştirilir. Hata fotoğraflarıyla birlikte 3 gün içinde <Link href="/contact">bize ulaşın</Link>.
        </LegalNote>
      </section>

      <section>
        <h2>Sipariş İptali</h2>
        <ul>
          <li>
            <strong>Baskıya girmeden önce:</strong> Siparişiniz üretim kuyruğuna girmeden iptal edebilirsiniz. Tam iade yapılır.
          </li>
          <li>
            <strong>Baskı başladıktan sonra:</strong> Özel tasarım ürünlerde iptal mümkün değildir. Standart ürünlerde %30 üretim bedeli kesilir.
          </li>
        </ul>
        <p>İptal talebi için sipariş numaranızla <Link href="/contact">İletişim</Link> sayfamızdan bize yazın.</p>
      </section>

      <section>
        <h2>Hasar/Eksik Teslimat</h2>
        <p>
          Ürün hasarlı veya eksik teslim edildiyse, kargo teslim tutanağına şerh düşürün ve
          fotoğraf + tutanakla birlikte <strong>3 gün içinde</strong> bize bildirin.
          Kargo kaynaklı hasarlarda yeni ürün gönderilir.
        </p>
      </section>

      <section>
        <h2>İletişim</h2>
        <p>
          İade ve iptal talepleriniz için:{" "}
          <a href="mailto:destek@adjy.com">destek@adjy.com</a>
          {" "}veya <Link href="/contact">İletişim Formu</Link>
        </p>
      </section>

    </LegalPage>
  );
}
