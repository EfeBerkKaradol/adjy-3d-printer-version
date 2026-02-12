import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Box, Layers, Zap } from "lucide-react";
import { StarBackground } from "@/components/ui/star-background";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[85vh] overflow-hidden bg-background pt-16 md:pt-20">
        <StarBackground />

        {/* Background Effects (Monochrome) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-foreground/5 rounded-full blur-[120px] opacity-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-foreground/5 rounded-full blur-[100px] opacity-20 pointer-events-none" />

        <div className="container relative z-10 mx-auto max-w-7xl px-4 text-center">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-4 md:mb-6">
              3D Baskı Ürünlerini
              <br />
              <span className="text-gradient">
                Kendin Tasarla
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8 md:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
              Parametrik 3D modelleri özelleştir, AR ile gerçek ortamında
              görüntüle ve hemen sipariş ver. Geleceğin üretim teknolojisi şimdi elinin altında.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full glow-white bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105" asChild>
                <Link href="/products">
                  Ürünleri Keşfet <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-border/40 bg-background/5 hover:bg-accent backdrop-blur-sm transition-all hover:scale-105" asChild>
                <Link href="/products?featured=true">
                  Nasıl Çalışıyor?
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce opacity-50 z-0 pointer-events-none">
          <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
            <div className="w-1 h-2 bg-muted-foreground rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-background relative overflow-hidden">
        <div className="container mx-auto max-w-7xl px-4 relative z-10">
          <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
              Neden <span className="font-[family-name:var(--font-orbitron)] tracking-widest text-foreground">ADJY</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sadece bir e-ticaret sitesi değil, yaratıcılığını gerçeğe dönüştüren bir platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl border border-border/40 bg-background/5 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-16 h-16 mb-6 rounded-2xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Box className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-3 relative z-10">
                Parametrik Özelleştirme
              </h3>
              <p className="text-muted-foreground relative z-10">
                Boyut, renk ve deseni istediğin gibi ayarla. Gerçek zamanlı 3D
                önizleme ile sonucu anında gör.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl border border-border/40 bg-background/5 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-16 h-16 mb-6 rounded-2xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-3 relative z-10">AR Görüntüleme</h3>
              <p className="text-muted-foreground relative z-10">
                Telefonunun kamerasını kullanarak ürünü gerçek ortamında
                görüntüle. Boyutları ve görünümü kontrol et.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl border border-border/40 bg-background/5 backdrop-blur-sm hover:bg-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-16 h-16 mb-6 rounded-2xl bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-foreground" />
              </div>
              <h3 className="font-bold text-xl mb-3 relative z-10">Kolay Sipariş</h3>
              <p className="text-muted-foreground relative z-10">
                Güvenli ödeme, hızlı üretim ve kargolama. Siparişini adım adım
                takip et ve ürününe kavuş.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
