"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ==========================================
// ALICI VE FATURA BİLGİLERİ
//
// İki iş birden görür:
//
// 1) Hesabı olmayan müşteriden iletişim bilgisi alır. Ödemeden
//    önce üyelik zorunluluğu kaldırıldı; şifre adımı yok,
//    sipariş arkada şifresiz bir kayda bağlanıyor.
//
// 2) Faturanın kesilebilmesi için gereken alanları toplar.
//    Bireysel faturada TC Kimlik No, kurumsalda ticaret unvanı,
//    vergi dairesi ve vergi numarası isteniyor — e-arşiv/e-fatura
//    bunlar olmadan düzenlenemiyor.
// ==========================================

export interface GuestFields {
  fullName: string;
  email: string;
  phone: string;
}

export interface InvoiceFields {
  type: "BIREYSEL" | "KURUMSAL";
  identityNumber: string;
  title: string;
  taxOffice: string;
  taxNumber: string;
}

interface BuyerDetailsStepProps {
  isGuest: boolean;
  guest: GuestFields;
  invoice: InvoiceFields;
  onGuestChange: (next: GuestFields) => void;
  onInvoiceChange: (next: InvoiceFields) => void;
}

export function BuyerDetailsStep({
  isGuest,
  guest,
  invoice,
  onGuestChange,
  onInvoiceChange,
}: BuyerDetailsStepProps) {
  const setGuest = (patch: Partial<GuestFields>) => onGuestChange({ ...guest, ...patch });
  const setInvoice = (patch: Partial<InvoiceFields>) =>
    onInvoiceChange({ ...invoice, ...patch });

  return (
    <div className="space-y-6">
      {isGuest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">İletişim Bilgileri</CardTitle>
            <p className="text-sm text-muted-foreground">
              Siparişini takip edebilmen için gerekli. Hesap açmana gerek yok —
              istersen{" "}
              <Link href="/login?callbackUrl=/checkout" className="underline underline-offset-4">
                giriş yapabilirsin
              </Link>
              .
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="guest-name">Ad Soyad</Label>
              <Input
                id="guest-name"
                className="mt-1.5"
                value={guest.fullName}
                onChange={(e) => setGuest({ fullName: e.target.value })}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="guest-email">E-posta</Label>
              <Input
                id="guest-email"
                type="email"
                inputMode="email"
                className="mt-1.5"
                value={guest.email}
                onChange={(e) => setGuest({ email: e.target.value })}
                autoComplete="email"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Sipariş onayı bu adrese gönderilir.
              </p>
            </div>
            <div>
              <Label htmlFor="guest-phone">Telefon</Label>
              <Input
                id="guest-phone"
                type="tel"
                inputMode="tel"
                className="mt-1.5"
                value={guest.phone}
                onChange={(e) => setGuest({ phone: e.target.value })}
                autoComplete="tel"
                placeholder="05XX XXX XX XX"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fatura Bilgileri</CardTitle>
          <p className="text-sm text-muted-foreground">
            Faturan bu bilgilerle düzenlenir.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            {(["BIREYSEL", "KURUMSAL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setInvoice({ type: t })}
                aria-pressed={invoice.type === t}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  invoice.type === t
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                {t === "BIREYSEL" ? "Bireysel" : "Kurumsal"}
              </button>
            ))}
          </div>

          {invoice.type === "BIREYSEL" ? (
            <div className="max-w-xs">
              <Label htmlFor="inv-tckn">TC Kimlik No</Label>
              <Input
                id="inv-tckn"
                inputMode="numeric"
                maxLength={11}
                className="mt-1.5"
                value={invoice.identityNumber}
                onChange={(e) =>
                  setInvoice({ identityNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })
                }
                placeholder="11 haneli"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                E-arşiv fatura için gerekli.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="inv-title">Ticaret Unvanı</Label>
                <Input
                  id="inv-title"
                  className="mt-1.5"
                  value={invoice.title}
                  onChange={(e) => setInvoice({ title: e.target.value })}
                  placeholder="Örnek Tasarım Ltd. Şti."
                />
              </div>
              <div>
                <Label htmlFor="inv-office">Vergi Dairesi</Label>
                <Input
                  id="inv-office"
                  className="mt-1.5"
                  value={invoice.taxOffice}
                  onChange={(e) => setInvoice({ taxOffice: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="inv-vkn">Vergi No</Label>
                <Input
                  id="inv-vkn"
                  inputMode="numeric"
                  maxLength={10}
                  className="mt-1.5"
                  value={invoice.taxNumber}
                  onChange={(e) =>
                    setInvoice({ taxNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
                  }
                  placeholder="10 haneli"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
