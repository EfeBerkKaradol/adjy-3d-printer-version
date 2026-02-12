"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Box,
  Layers,
  Smartphone,
  Printer,
  Eye,
  Palette,
  PackageCheck,
  ShieldCheck,
  Truck,
  Users,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/section-heading";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { ProductCard } from "@/components/product/product-card";
import {
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/common/motion";
import { mockProducts } from "@/lib/mock-data";

const features = [
  {
    icon: Eye,
    title: "3D Onizleme",
    description:
      "Urunleri 360 derece dondurerek her acisindan inceleyin. Gercekci 3D modeller ile satin almadan once detaylica kesfet.",
  },
  {
    icon: Smartphone,
    title: "AR Goruntuleme",
    description:
      "Arttirilmis gerceklik ile urunlerin gercek boyutlarini kendi mekaninizda goruntuleyin.",
  },
  {
    icon: Palette,
    title: "Kisisellestirilmis Uretim",
    description:
      "Boyut, renk ve malzeme secenekleriyle urunleri tamamen ihtiyaciniza gore kisisellestirebilirsiniz.",
  },
];

const steps = [
  {
    icon: Box,
    title: "Urun Secin",
    description: "Genis urun yelpazemizden ihtiyaciniza uygun modeli secin.",
  },
  {
    icon: Palette,
    title: "Ozellestirin",
    description: "Boyut, renk, malzeme ve diger parametreleri ayarlayin.",
  },
  {
    icon: Eye,
    title: "3D Onizleme",
    description: "Degisikliklerinizi anlik olarak 3D modelde goruntuleyin.",
  },
  {
    icon: Printer,
    title: "Siparis Verin",
    description: "Onaylayin ve profesyonel 3D baski ile uretilmesini bekleyin.",
  },
];

const stats = [
  { value: 1500, suffix: "+", label: "Urun Cesidi" },
  { value: 12000, suffix: "+", label: "Mutlu Musteri" },
  { value: 50000, suffix: "+", label: "Tamamlanan Baski" },
  { value: 99, suffix: "%", label: "Memnuniyet Orani" },
];

const featuredProducts = mockProducts.filter((p) =>
  ["1", "2", "3", "10", "12", "4"].includes(p.id)
);

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16 lg:pt-20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-gradient-start/20 blur-[128px] animate-gradient" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-gradient-end/20 blur-[128px] animate-gradient" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center lg:px-8 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gradient-end opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-end" />
              </span>
              Yeni Nesil 3D Baski Platformu
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-balance font-heading md:text-6xl lg:text-7xl"
          >
            Hayallerinizi{" "}
            <span className="bg-gradient-to-r from-gradient-start to-gradient-end bg-clip-text text-transparent">
              3D Olarak
            </span>{" "}
            Uretiyoruz
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg lg:text-xl"
          >
            3D modelleme, arttirilmis gerceklik onizleme ve profesyonel baski
            hizmetleri ile fikirlerinizi gercege donusturun.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button variant="gradient" size="xl" asChild>
              <Link href="/urunler">
                Urunleri Kesfet
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link href="/urunler/kisiye-ozel-figur">
                <Eye className="mr-2 h-5 w-5" />
                3D Viewer Demo
              </Link>
            </Button>
          </motion.div>

          {/* Floating 3D model placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative mx-auto mt-16 max-w-2xl"
          >
            <div className="gradient-border rounded-2xl">
              <div className="flex aspect-video items-center justify-center rounded-2xl bg-card/50 backdrop-blur-sm">
                <motion.div
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  style={{ perspective: 1000 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Box className="h-20 w-20 text-accent/40 md:h-28 md:w-28" />
                  <span className="text-sm text-muted-foreground">
                    3D Model Onizleme Alani
                  </span>
                </motion.div>
              </div>
            </div>
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-gradient-start/10 to-gradient-end/10 blur-2xl" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Neden Bizi Secmelisiniz?"
              subtitle="En son teknolojiyi kullanarak 3D baski deneyiminizi bir ust seviyeye tasiyoruz."
            />
          </ScrollReveal>

          <StaggerContainer className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="group relative flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center transition-shadow hover:shadow-xl hover:shadow-accent/5"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-gradient-start to-gradient-end text-primary-foreground transition-transform duration-300 group-hover:scale-110">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold font-heading">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Featured Products */}
      <section className="relative border-y border-border bg-card/30 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <ScrollReveal>
            <div className="flex items-end justify-between mb-12">
              <SectionHeading
                title="One Cikan Urunler"
                subtitle="En populer ve yenilikci urunlerimizi kesfedin."
                align="left"
                className="mb-0"
              />
              <Button variant="ghost" asChild className="hidden md:flex">
                <Link href="/urunler">
                  Tumu
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <StaggerItem key={product.id}>
                <ProductCard product={product} />
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" asChild>
              <Link href="/urunler">
                Tum Urunleri Gor
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Nasil Calisiyor?"
              subtitle="4 kolay adimda hayalinizdeki urunu uretim surecine baslatin."
            />
          </ScrollReveal>

          <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <StaggerItem key={step.title}>
                <div className="relative flex flex-col items-center text-center">
                  {/* Step number */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gradient-start to-gradient-end text-lg font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-gradient-start/30 to-gradient-end/30 lg:block" />
                  )}
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <step.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold font-heading">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-y border-border bg-card/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <StaggerContainer className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <StaggerItem key={stat.label}>
                <div className="flex flex-col items-center text-center">
                  <span className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl font-heading">
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                    />
                  </span>
                  <span className="mt-2 text-sm text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <ScrollReveal>
            <SectionHeading
              title="Guvenle Alisveris"
              subtitle="Musterilerimizin memnuniyeti en buyuk oncelugimizdir."
            />
          </ScrollReveal>

          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Guvenli Odeme", desc: "256-bit SSL sertifikasi ile korunmaktasiniz." },
              { icon: Truck, title: "Hizli Kargo", desc: "Turkiye genelinde 2-4 is gunu icinde teslimat." },
              { icon: PackageCheck, title: "Kolay Iade", desc: "14 gun icerisinde kosulsuz iade hakki." },
              { icon: Users, title: "7/24 Destek", desc: "Teknik destek ekibimiz her zaman yardima hazir." },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold font-heading">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Band */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gradient-start to-gradient-end" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:40px_40px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center lg:px-8 lg:py-24">
          <ScrollReveal>
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground font-heading md:text-4xl lg:text-5xl text-balance">
              Projenizi Hayata Gecirmeye Hazir Misiniz?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80 leading-relaxed md:text-lg">
              Hemen uye olun ve ozel indirimlerden faydalanin. Ilk siparisunizde %10 indirim!
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <Link href="/kayit">
                  Ucretsiz Kayit Ol
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="/urunler">Urunleri Incele</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
