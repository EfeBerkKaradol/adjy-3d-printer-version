import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FaqJsonLd, type FaqEntry } from "@/components/seo/JsonLd";
import { OrderJourney } from "@/components/home/OrderJourney";
import { PixelLink } from "@/components/ui/pixel-link";

// ==========================================
// SIKÇA SORULAN SORULAR
//
// Sorular veri olarak tutuluyor: aynı kaynaktan hem sayfa
// hem de arama motorlarının okuduğu yapısal veri üretiliyor.
// İkisi birebir aynı olmak zorunda — metin sayfada farklı
// görünürse Google yapısal veriyi yok sayıyor.
//
// İçerik ayrıca güncellendi: eski hâli "model yükleme
// kapalıdır" diyordu, oysa hem model yükleme hem fotoğraftan
// üretim çalışıyor. Seramik ve alçıdan da hiç söz edilmiyordu.
// ==========================================

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description:
    "Ölçü değiştirme, 3D baskı, seramik ve alçı üretim, kargo, iade ve sipariş takibi hakkında merak edilenler.",
  alternates: { canonical: "/faq" },
};

const FAQ: FaqEntry[] = [
  {
    question: "Ürünlerin ölçüsünü değiştirebilir miyim?",
    answer:
      "Evet. Ürünlerin çoğu parametrik: genişlik, yükseklik gibi ölçüleri kendi alanınıza göre santimetre cinsinden ayarlayabilirsiniz. Ölçüyü değiştirdiğinizde fiyat da anında güncellenir, çünkü fiyat harcanan malzemeye göre hesaplanır.",
  },
  {
    question: "Hangi malzemelerle üretim yapıyorsunuz?",
    answer:
      "Üç şekilde üretiyoruz: 3D baskı, seramik ve alçı. 3D baskıda genel kullanım için PLA, dayanıklılık gereken yerlerde PETG, ABS veya esnek TPU kullanılıyor. Seramik ve alçı ürünler kalıpla üretilip elden geçiriliyor. Mağazada üretim türüne göre filtreleyebilirsiniz.",
  },
  {
    question: "Kendi 3D modelimi yükleyip bastırabilir miyim?",
    answer:
      "Evet. Üret bölümünden STL dosyanızı yükleyebilirsiniz; sistem modeli ölçüp malzeme, kalite ve adet seçimine göre fiyatı anında gösterir. En büyük kenar 30 santimetreye kadar olan modelleri üretebiliyoruz.",
  },
  {
    question: "Elimde 3D model yok, sadece fotoğrafım var. Ne yapabilirim?",
    answer:
      "Beğendiğiniz bir objenin fotoğrafını yükleyebilirsiniz. ADJY fotoğraftan düzenlenebilir bir 3D model çıkarır; ölçüsünü değiştirip fiyatını görebilir, odanızda AR ile bakabilir ve üretime gönderebilirsiniz.",
  },
  {
    question: "Ürünü satın almadan odamda görebilir miyim?",
    answer:
      "Evet. Ürün sayfasındaki “AR’da Gör” ile ürünü telefonunuzun kamerasından kendi odanızda, seçtiğiniz gerçek ölçüsünde görüntüleyebilirsiniz.",
  },
  {
    question: "Üye olmadan sipariş verebilir miyim?",
    answer:
      "Evet. Ad, e-posta ve telefon bilgilerinizi girip şifre belirlemeden sipariş verebilirsiniz. Sipariş onayı e-posta ile gönderilir. İsterseniz hesap açarak siparişlerinizi tek yerden takip edebilirsiniz.",
  },
  {
    question: "Siparişim ne kadar sürede hazırlanır?",
    answer:
      "Ortalama bir sipariş 2-5 iş günü içinde üretilir. Ölçü büyüdükçe baskı süresi uzar; ürün sayfasında seçtiğiniz ölçüye göre tahmini üretim süresi gösterilir. Üretim bittikten sonra kargoya verilir.",
  },
  {
    question: "Kargo ücreti ne kadar, ne zaman ücretsiz?",
    answer:
      "500 TL ve üzeri siparişlerde kargo ücretsizdir. Altındaki siparişlerde kargo ücreti ödeme adımında seçtiğiniz gönderim şekline göre hesaplanır. Tüm Türkiye'ye gönderim yapılıyor.",
  },
  {
    question: "İade ve değişim nasıl işliyor?",
    answer:
      "Hazır ürünlerde teslim tarihinden itibaren 14 gün içinde iade hakkınız var. Size özel ölçüde üretilmiş ürünlerde, Tüketici Hakları Kanunu gereği iade kabul edilmiyor. Ancak üretim hatası (katman kayması, kırık, eksik parça) olursa ürün ücretsiz yeniden üretilir.",
  },
  {
    question: "Faturamı nasıl alırım?",
    answer:
      "Ödeme adımında bireysel ya da kurumsal fatura seçebilirsiniz. Bireysel faturada TC Kimlik numaranız, kurumsalda ticaret unvanı, vergi dairesi ve vergi numarası isteniyor. Fatura siparişinizle birlikte düzenlenir.",
  },
  {
    question: "Toplu siparişlerde indirim var mı?",
    answer:
      "Evet. Adet arttıkça birim fiyat düşer ve indirim ödeme ekranında otomatik uygulanır. Kurumsal promosyon, etkinlik ya da toptan talepler için iletişim formundan yazabilirsiniz.",
  },
];

export default function FAQPage() {
  return (
    <div className="adjy-container py-14 md:py-20">
      <FaqJsonLd items={FAQ} />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <header className="lg:sticky lg:top-24 lg:self-start">
          <p className="adjy-eyebrow mb-5">Yardım</p>
          <h1 className="adjy-display text-[clamp(1.9rem,4.2vw,3rem)]">
            Sıkça sorulan sorular
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Ölçü değiştirme, üretim, kargo ve iade hakkında en çok sorulanlar.
          </p>

          {/* Aradığını bulamayan için kısa yol */}
          <div className="adjy-pixel-card mt-9 max-w-md p-5 [background-image:radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1.5px)] [background-size:10px_10px]">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {String(FAQ.length).padStart(2, "0")} soru · aradığın yok mu?
            </p>
            <p className="mt-2 text-[15px] leading-relaxed">
              Bize yaz, aynı iş günü içinde dönelim.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <PixelLink href="/contact" variant="solid">
                Bize yazın
              </PixelLink>
            </div>
          </div>
        </header>

        <Accordion type="single" collapsible className="grid gap-4">
          {FAQ.map((item, i) => (
            <AccordionItem key={item.question} value={`q-${i}`} className="adjy-pixel-card">
              <AccordionTrigger className="group/soru items-center gap-4 px-4 py-4 text-left text-[15px] font-medium hover:no-underline sm:px-5">
                <span className="flex items-center gap-4">
                  <span className="adjy-pixel-box shrink-0 bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums tracking-[0.1em] group-data-[state=open]/soru:bg-foreground group-data-[state=open]/soru:text-background">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="border-t-2 border-dashed border-foreground/25 px-4 pb-5 pt-4 text-[15px] leading-relaxed text-muted-foreground sm:px-5">
                  {item.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Sipariş süreci: siparişten kapıya altı adım */}
      <div className="mt-16 border-t-2 border-dashed border-foreground/25">
        <OrderJourney />
      </div>
    </div>
  );
}
