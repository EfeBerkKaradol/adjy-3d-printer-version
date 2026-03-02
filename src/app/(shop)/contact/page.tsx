"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const [sending, setSending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactInput) => {
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Mesajiniz gonderildi!");
        reset();
      } else {
        const err = await res.json();
        toast.error(err.error || "Mesaj gonderilemedi");
      }
    } catch {
      toast.error("Bir hata olustu");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Iletisim</h1>
      <p className="text-muted-foreground mb-8">Sorulariniz icin bize ulasin</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mesaj Gonderin</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input id="name" {...register("name")} placeholder="Adiniz Soyadiniz" />
                    {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="ornek@email.com" />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Konu</Label>
                  <Input id="subject" {...register("subject")} placeholder="Mesajinizin konusu" />
                  {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mesaj</Label>
                  <textarea
                    id="message"
                    {...register("message")}
                    rows={5}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Mesajinizi yazin..."
                  />
                  {errors.message && <p className="text-xs text-red-500">{errors.message.message}</p>}
                </div>

                <Button type="submit" disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Gonder
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">E-posta</p>
                  <p className="text-sm text-muted-foreground">destek@adjy.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Telefon</p>
                  <p className="text-sm text-muted-foreground">+90 (212) 000 00 00</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Adres</p>
                  <p className="text-sm text-muted-foreground">Istanbul, Turkiye</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
