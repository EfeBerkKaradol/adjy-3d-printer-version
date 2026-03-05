"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone, Send } from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      toast.success("Mesajınız başarıyla gönderildi! En kısa sürede dönüş yapacağız.");
      reset();
    } catch (error) {
      toast.error("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-12 px-4 md:py-24 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold font-[var(--font-orbitron)] tracking-wider mb-4">
          Bize Ulaşın
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          3D baskı projeniz, toptan siparişleriniz veya aklınıza takılan herhangi bir soru için
          bizimle iletişime geçmekten çekinmeyin.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Contact Info Cards */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Adres</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Teknoloji Geliştirme Bölgesi<br />
                  3D Inovasyon Merkezi, İstanbul
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">E-posta</h3>
                <p className="text-muted-foreground mt-1 text-sm">info@adjy3d.com</p>
                <p className="text-muted-foreground text-sm">destek@adjy3d.com</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Telefon</h3>
                <p className="text-muted-foreground mt-1 text-sm">+90 (212) 555 0123</p>
                <p className="text-muted-foreground text-sm">Pzt - Cuma, 09:00 - 18:00</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-2">
          <Card className="border-border/50 bg-card/60 backdrop-blur shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Mesaj Gönderin</CardTitle>
              <CardDescription>
                Taleplerinizi detaylıca iletirseniz, size o kadar hızlı yardımcı oluruz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ad Soyad</label>
                    <Input
                      {...register("name")}
                      placeholder="John Doe"
                      className="bg-background/50"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-posta</label>
                    <Input
                      {...register("email")}
                      placeholder="adiniz@sirket.com"
                      className="bg-background/50"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Konu</label>
                  <Input
                    {...register("subject")}
                    placeholder="Sipariş, Toptan Satış veya Genel Soru"
                    className="bg-background/50"
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-500">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mesajınız</label>
                  <Textarea
                    {...register("message")}
                    placeholder="Nasıl yardımcı olabiliriz?"
                    className="min-h-[150px] bg-background/50 resize-y"
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto mt-4"
                  size="lg"
                >
                  {isSubmitting ? (
                    "Gönderiliyor..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Mesajı Gönder
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
