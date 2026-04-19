import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "İade ve İptal Politikası | ADJY",
  description: "ADJY 3D baskı ürünleri için iade, iptal ve değişim politikası hakkında bilgi alın.",
};

export default function ReturnPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">İade ve İptal Politikası</h1>
      <p className="text-sm text-muted-foreground mb-8">Son güncelleme: Nisan 2026</p>

      <div className="prose prose-sm prose-invert max-w-none space-y-8 text-muted-foreground">

        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Genel Kurallar</h2>
          <p>
            ADJY olarak müşteri memnuniyetini ön planda tutuyoruz. 6502 sayılı Tüketicinin Korunması
            Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamındaki haklarınız saklıdır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. İade Hakkı — Standart Ürünler</h2>
          <p>
            Katalogdaki hazır (parametrik olmayan) ürünlerde, ürünü teslim aldığınız tarihten itibaren
            <strong className="text-foreground"> 14 gün</strong> içinde iade talebinde bulunabilirsiniz.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Ürün kullanılmamış ve orijinal ambalajında olmalıdır.</li>
            <li>Kargo ücreti alıcıya aittir.</li>
            <li>İade kargo adresimiz için <Link href="/contact" className="underline hover:text-foreground">İletişim</Link> sayfasını ziyaret edin.</li>
            <li>Onaylanan iadeler 5–10 iş günü içinde ödeme yönteminize iade edilir.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. İade Kabul Edilmeyen Durumlar — Özel Tasarım Ürünler</h2>
          <p>
            Parametrik (kişiye özel) olarak üretilen ürünler, Mesafeli Sözleşmeler Yönetmeliği
            Madde 15/1-c uyarınca cayma hakkı kapsamı dışındadır:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Renk, boyut, desen gibi parametrelerle özelleştirilmiş siparişler.</li>
            <li>Baskıya girmiş veya tamamlanmış tüm özel üretimler.</li>
          </ul>
          <p className="mt-2">
            <strong className="text-foreground">İstisna:</strong> Üretim hatası veya baskı kalitesi sorunu tespit edilirse, ürün ücretsiz yeniden baskı ile değiştirilir. Hata fotoğraflarıyla birlikte 3 gün içinde <Link href="/contact" className="underline hover:text-foreground">bize ulaşın</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Sipariş İptali</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong className="text-foreground">Baskıya girmeden önce:</strong> Siparişiniz üretim kuyruğuna girmeden iptal edebilirsiniz. Tam iade yapılır.
            </li>
            <li>
              <strong className="text-foreground">Baskı başladıktan sonra:</strong> Özel tasarım ürünlerde iptal mümkün değildir. Standart ürünlerde %30 üretim bedeli kesilir.
            </li>
          </ul>
          <p className="mt-2">İptal talebi için sipariş numaranızla <Link href="/contact" className="underline hover:text-foreground">İletişim</Link> sayfamızdan bize yazın.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Hasar/Eksik Teslimat</h2>
          <p>
            Ürün hasarlı veya eksik teslim edildiyse, kargo teslim tutanağına şerh düşürün ve
            fotoğraf + tutanakla birlikte <strong className="text-foreground">3 gün içinde</strong> bize bildirin.
            Kargo kaynaklı hasarlarda yeni ürün gönderilir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. İletişim</h2>
          <p>
            İade ve iptal talepleriniz için:{" "}
            <a href="mailto:destek@adjy.com" className="underline hover:text-foreground">destek@adjy.com</a>
            {" "}veya <Link href="/contact" className="underline hover:text-foreground">İletişim Formu</Link>
          </p>
        </section>

      </div>
    </div>
  );
}
