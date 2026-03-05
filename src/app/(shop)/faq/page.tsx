"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, RefreshCcw, Truck, Printer } from "lucide-react";

export default function FAQPage() {
  return (
    <div className="container py-12 md:py-24 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-5xl font-bold font-[var(--font-orbitron)] tracking-wider mb-6 leading-tight">
          Sıkça Sorulan Sorular
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
          3D baskı, sipariş süreçleri ve teslimat hakkında aklınıza takılan soruların yanıtlarını burada bulabilirsiniz.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {/* Quick Info Cards */}
        <Card className="bg-primary/5 border-primary/20 transition-all hover:bg-primary/10">
          <CardHeader>
            <Printer className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Baskı Süreci</CardTitle>
            <CardDescription>Ortalama bir siparişin hazırlanma süresi 2-5 iş günüdür.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-primary/5 border-primary/20 transition-all hover:bg-primary/10">
          <CardHeader>
            <Truck className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Kargo Teslimatı</CardTitle>
            <CardDescription>Baskı tamamlandıktan sonra tüm Türkiye'ye Yurtiçi Kargo ile gönderim sağlanır.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full space-y-4">
          <AccordionItem value="item-1" className="border px-6 rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
              <span className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                Kendi modelimi yükleyip bastırabilir miyim?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 pt-1">
              Şu anki sistemimizde doğrudan 3D model (.stl / .obj) yükleme özelliği kapalıdır. Yalnızca sunduğumuz parametrik ürünleri (renk, ebat, eklenti seçerek) özelleştirebilirsiniz. Özel baskı talepleriniz için "Bize Ulaşın" sayfasından mesaj gönderebilirsiniz.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border px-6 rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
              <span className="flex items-center gap-3">
                <RefreshCcw className="h-5 w-5 text-primary shrink-0" />
                Kişiselleştirilmiş ürünlerde iade/değişim mümkün mü?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 pt-1">
              Tüketici Hakları Kanunu gereği size özel üretilmiş (isim kazınmış, özel ölçüde basılmış) 3D baskılarda iade kabul edilmemektedir. Ancak baskı hatası (katman kayması, eksik parça vb.) tespit edilirse yenisi ücretsiz olarak üretilip gönderilir.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border px-6 rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
              <span className="flex items-center gap-3">
                <Printer className="h-5 w-5 text-primary shrink-0" />
                Hangi malzemeleri (materyalleri) kullanıyorsunuz?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 pt-1">
              Genel kullanım için PLA (Polilaktik Asit) ve PLA+ kullanılmaktadır. Darbeye dayanıklı mekanik parçalar için PETG veya TPU (Esnek) seçeneklerimiz de sipariş verirken tercih edilebilir. Listede bulunmayan özel materyaller (Carbon Fiber vb.) için iletişime geçebilirsiniz.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border px-6 rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
              <span className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-primary shrink-0" />
                Siparişimin durumunu nasıl takip edebilirim?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 pt-1">
              Giriş yaptıktan sonra &quot;Profil -&gt; Siparişlerim&quot; sayfasından baskının hangi aşamada olduğunu anlık görebilirsiniz (Baskıda, Kalite Kontrol, Kargoda vb.). Ürün kargoya verildiğinde e-posta ile kargo takip numaranız ayrıca iletilecektir.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border px-6 rounded-lg bg-card shadow-sm">
            <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
              <span className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                Toplu siparişlerde indirim yapıyor musunuz?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4 pt-1">
              Evet! Şirket promosyonları, etkinlikler veya toptan satışlar için bizimle e-posta veya iletişim formu üzerinden iletişime geçtiğinizde, adet sayısına ve baskı süresine göre özel fiyatlandırma yapabiliyoruz.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
