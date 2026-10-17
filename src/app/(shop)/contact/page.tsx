"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationMap } from "@/components/contact/LocationMap";
import { ArrowRight, Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { COMPANY, formatAddress, mapsEmbedUrl, mapsLink } from "@/lib/company";

// ==========================================
// İLETİŞİM
//
// Sayfada bir adres ve bir form vardı; yazdıktan sonra ne
// olacağı, ne zaman dönüleceği ve buradan başka nereye
// gidilebileceği yazmıyordu.
//
// Şimdi üç şey açık: hangi yoldan ulaşılacağı (e-posta, adres,
// saatler), ne zaman dönüleceği, ve çoğu sorunun cevabının
// zaten nerede durduğu — soruyu hiç sormadan çözülsün diye
// SSS, teslimat ve iade sayfaları formun yanında.
//
// Harita kendiliğinden yüklenmez: ziyaretçi istemeden üçüncü
// tarafa istek gitmez.
// ==========================================

/** Soruyu hiç sormadan cevabını bulabileceği yerler */
const KISAYOLLAR = [
  { label: "Sık sorulan sorular", href: "/faq", body: "Ölçü, malzeme ve üretim süresi" },
  { label: "Teslimat", href: "/teslimat-politikasi", body: "Kargo süresi ve ücretler" },
  { label: "İade ve iptal", href: "/iade-politikasi", body: "14 gün içinde cayma hakkı" },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adres = COMPANY.address ? formatAddress(COMPANY.address) : null;
  const harita = mapsLink();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactInput) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Mesaj gönderilemedi");
      }

      toast.success("Mesajın bize ulaştı. Genelde aynı iş günü içinde dönüyoruz.");
      reset();
    } catch (error) {
      toast.error("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="adjy-container py-14 md:py-20">
      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-5">İletişim</p>
        <h1 className="adjy-display text-[clamp(2rem,4.4vw,3.25rem)]">
          Bir sorunla mı, bir fikirle mi geldin?
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Siparişin, ölçüsünü değiştirmek istediğin bir nesne, toptan bir iş ya da
          aklına takılan herhangi bir şey — yaz, okuyoruz. Genelde{" "}
          <strong className="font-medium text-foreground">aynı iş günü içinde</strong>{" "}
          dönüyoruz.
        </p>
      </header>

      {/* Ulaşım yolları */}
      <section className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {COMPANY.email && (
          <div className="bg-background p-6">
            <Mail className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-[15px] font-medium tracking-tight">E-posta</h2>
            <a
              href={`mailto:${COMPANY.email}`}
              className="mt-2 inline-block break-all text-sm underline-offset-4 hover:underline"
            >
              {COMPANY.email}
            </a>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sipariş numaran varsa yazarsan daha hızlı buluruz.
            </p>
          </div>
        )}

        {COMPANY.phone && (
          <div className="bg-background p-6">
            <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-[15px] font-medium tracking-tight">Telefon</h2>
            <a
              href={`tel:${COMPANY.phone.replace(/[^+\d]/g, "")}`}
              className="mt-2 inline-block text-sm underline-offset-4 hover:underline"
            >
              {COMPANY.phone}
            </a>
          </div>
        )}

        {COMPANY.address && (
          <div className="bg-background p-6">
            <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-[15px] font-medium tracking-tight">Atölye ve ofis</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {COMPANY.address.line1}
              <br />
              {COMPANY.address.line2}
              <br />
              {COMPANY.address.postalCode} {COMPANY.address.district}/{COMPANY.address.city}
            </p>
            {harita && (
              <a
                href={harita}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm underline-offset-4 hover:underline"
              >
                Yol tarifi al
              </a>
            )}
          </div>
        )}

        {COMPANY.workingHours && (
          <div className="bg-background p-6">
            <Clock className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-[15px] font-medium tracking-tight">Çalışma saatleri</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {COMPANY.workingHours}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Hafta sonu gelen mesajlara pazartesi dönüyoruz.
            </p>
          </div>
        )}
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        {/* Form */}
        <div>
          <h2 className="text-xl font-medium tracking-tight">Mesaj yaz</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ne kadar anlatırsan o kadar hızlı yardımcı oluruz.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="contact-name" className="text-sm font-medium">
                  Ad soyad
                </label>
                <Input id="contact-name" {...register("name")} placeholder="Adın" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-email" className="text-sm font-medium">
                  E-posta
                </label>
                <Input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  placeholder="sana nereden dönelim?"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-subject" className="text-sm font-medium">
                Konu
              </label>
              <Input
                id="contact-subject"
                {...register("subject")}
                placeholder="Sipariş, ölçü değişikliği, toptan iş…"
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-message" className="text-sm font-medium">
                Mesajın
              </label>
              <Textarea
                id="contact-message"
                {...register("message")}
                placeholder="Hangi nesne, hangi ölçü, ne zaman lazım?"
                className="min-h-[150px] resize-y"
              />
              {errors.message && (
                <p className="text-sm text-destructive">{errors.message.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? (
                "Gönderiliyor…"
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" aria-hidden />
                  Mesajı gönder
                </>
              )}
            </Button>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Verdiğin bilgiler yalnızca sorunu yanıtlamak için kullanılır.{" "}
              <Link href="/kvkk" className="underline underline-offset-4">
                KVKK aydınlatma metni
              </Link>
            </p>
          </form>
        </div>

        {/* Harita ve kısayollar */}
        <aside className="space-y-8">
          {adres && (
            <LocationMap address={adres} href={harita} embedUrl={mapsEmbedUrl()} />
          )}

          <div>
            <h2 className="text-xl font-medium tracking-tight">Önce buraya bak</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Çok sorulanların cevabı hazır — beklemene gerek kalmaz.
            </p>
            <ul className="mt-5 grid gap-px overflow-hidden rounded-xl border border-border bg-border">
              {KISAYOLLAR.map((k) => (
                <li key={k.href}>
                  <Link
                    href={k.href}
                    className="group flex items-center justify-between gap-4 bg-background p-4 transition-colors hover:bg-muted"
                  >
                    <span>
                      <span className="block text-[15px] font-medium tracking-tight">
                        {k.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {k.body}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
