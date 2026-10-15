import type { Metadata } from "next";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FaqJsonLd, type FaqEntry } from "@/components/seo/JsonLd";

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
      "Evet. Ürünlerin çoğu parametrik: genişlik, yükseklik gibi ölçüleri kendi alanına göre santimetre cinsinden ayarlayabilirsin. Ölçüyü değiştirdiğinde fiyat da anında güncellenir, çünkü fiyat harcanan malzemeye göre hesaplanır.",
  },
  {
    question: "Hangi malzemelerle üretim yapıyorsunuz?",
    answer:
      "Üç şekilde üretiyoruz: 3D baskı, seramik ve alçı. 3D baskıda genel kullanım için PLA, dayanıklılık gereken yerlerde PETG, ABS veya esnek TPU kullanılıyor. Seramik ve alçı ürünler kalıpla üretilip elden geçiriliyor. Mağazada üretim türüne göre filtreleyebilirsin.",
  },
  {
    question: "Kendi 3D modelimi yükleyip bastırabilir miyim?",
    answer:
      "Evet. Üret bölümünden STL dosyanı yükleyebilirsin; sistem modeli ölçüp malzeme, kalite ve adet seçimine göre fiyatı anında gösterir. En büyük kenar 30 santimetreye kadar olan modelleri üretebiliyoruz.",
  },
  {
    question: "Elimde 3D model yok, sadece fotoğrafım var. Ne yapabilirim?",
    answer:
      "Beğendiğin bir objenin fotoğrafını yükleyebilirsin. ADJY fotoğraftan düzenlenebilir bir 3D model çıkarır; ölçüsünü değiştirip fiyatını görebilir, odanda AR ile bakabilir ve üretime gönderebilirsin.",
  },
  {
    question: "Ürünü satın almadan odamda görebilir miyim?",
    answer:
      "Evet. Ürün sayfasındaki “AR’da Gör” ile nesneyi telefonunun kamerasından kendi odanda, seçtiğin gerçek ölçüsünde görüntüleyebilirsin.",
  },
  {
    question: "Üye olmadan sipariş verebilir miyim?",
    answer:
      "Evet. Ad, e-posta ve telefon bilgilerini girip şifre belirlemeden sipariş verebilirsin. Sipariş onayı e-posta ile gönderilir. İstersen hesap açarak siparişlerini tek yerden takip edebilirsin.",
  },
  {
    question: "Siparişim ne kadar sürede hazırlanır?",
    answer:
      "Ortalama bir sipariş 2-5 iş günü içinde üretilir. Ölçü büyüdükçe baskı süresi uzar; ürün sayfasında seçtiğin ölçüye göre tahmini üretim süresi gösterilir. Üretim bittikten sonra kargoya verilir.",
  },
  {
    question: "Kargo ücreti ne kadar, ne zaman ücretsiz?",
    answer:
      "500 TL ve üzeri siparişlerde kargo ücretsizdir. Altındaki siparişlerde kargo ücreti ödeme adımında seçtiğin gönderim şekline göre hesaplanır. Tüm Türkiye'ye gönderim yapılıyor.",
  },
  {
    question: "İade ve değişim nasıl işliyor?",
    answer:
      "Hazır ürünlerde teslim tarihinden itibaren 14 gün içinde iade hakkın var. Sana özel ölçüde üretilmiş ürünlerde, Tüketici Hakları Kanunu gereği iade kabul edilmiyor. Ancak üretim hatası (katman kayması, kırık, eksik parça) olursa ürün ücretsiz yeniden üretilir.",
  },
  {
    question: "Faturamı nasıl alırım?",
    answer:
      "Ödeme adımında bireysel ya da kurumsal fatura seçebilirsin. Bireysel faturada TC Kimlik numaran, kurumsalda ticaret unvanı, vergi dairesi ve vergi numarası isteniyor. Fatura siparişinle birlikte düzenlenir.",
  },
  {
    question: "Toplu siparişlerde indirim var mı?",
    answer:
      "Evet. Adet arttıkça birim fiyat düşer ve indirim ödeme ekranında otomatik uygulanır. Kurumsal promosyon, etkinlik ya da toptan talepler için iletişim formundan yazabilirsin.",
  },
];

export default function FAQPage() {
  return (
    <div className="adjy-container adjy-section">
      <FaqJsonLd items={FAQ} />

      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-5">Yardım</p>
        <h1 className="adjy-display text-[clamp(1.9rem,4.2vw,3rem)]">
          Sıkça sorulan sorular
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Ölçü değiştirme, üretim, kargo ve iade hakkında en çok sorulanlar.
          Aradığını bulamazsan{" "}
          <Link href="/contact" className="underline underline-offset-4">
            bize yazabilirsin
          </Link>
          .
        </p>
      </header>

      <Accordion type="single" collapsible className="mt-12 border-t border-border">
        {FAQ.map((item, i) => (
          <AccordionItem
            key={item.question}
            value={`q-${i}`}
            className="border-b border-border"
          >
            <AccordionTrigger className="py-5 text-left text-[15px] font-medium hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-[15px] leading-relaxed text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
