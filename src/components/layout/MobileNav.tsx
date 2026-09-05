"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { MAIN_NAV, SECONDARY_NAV } from "@/lib/navigation";
import { ArrowUpRight, LogOut, MapPin, Package, Shield, User } from "lucide-react";

// ==========================================
// MOBİL NAVİGASYON ÇEKMECESİ
// Masaüstünün küçültülmüş hâli değil: ana üç eylem
// büyük dokunma hedefleriyle önce gelir, hesap
// bağlantıları altta toplanır.
// ==========================================

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isAdmin = session?.user?.role === "ADMIN";

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-sm"
      >
        <div className="border-b border-border px-5 py-4">
          <SheetTitle className="font-[family-name:var(--font-orbitron)] text-lg font-extrabold tracking-[0.22em]">
            ADJY
          </SheetTitle>
        </div>
        <SheetDescription className="sr-only">Site navigasyonu</SheetDescription>

        <nav className="flex-1 overflow-y-auto" aria-label="Mobil navigasyon">
          <ul className="divide-y divide-border">
            {MAIN_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="flex min-h-16 items-center justify-between gap-4 px-5 py-4 transition-colors active:bg-surface"
                >
                  <span>
                    <span className="block text-lg font-medium tracking-tight">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {link.description}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          {/* İkincil bağlantılar — ana üç eylemin altında */}
          <ul className="divide-y divide-border border-t border-border">
            {SECONDARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="flex min-h-12 items-center justify-between gap-4 px-5 py-3 text-sm transition-colors active:bg-surface"
                >
                  {link.label}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-border px-5 py-5">
            <p className="adjy-eyebrow mb-3">Hesap</p>
            {isLoggedIn ? (
              <div className="grid gap-1">
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="flex min-h-11 items-center gap-3 text-sm font-medium text-brand-amber"
                  >
                    <Shield className="h-4 w-4" aria-hidden /> Admin Paneli
                  </Link>
                )}
                <Link
                  href="/profile"
                  onClick={close}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden /> Profilim
                </Link>
                <Link
                  href="/profile/orders"
                  onClick={close}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <Package className="h-4 w-4 text-muted-foreground" aria-hidden /> Siparişlerim
                </Link>
                <Link
                  href="/profile/addresses"
                  onClick={close}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden /> Adreslerim
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex min-h-11 items-center gap-3 text-left text-sm text-destructive"
                >
                  <LogOut className="h-4 w-4" aria-hidden /> Çıkış Yap
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Link
                  href="/login"
                  onClick={close}
                  className="flex h-12 items-center justify-center bg-primary text-sm font-medium text-primary-foreground"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="flex h-12 items-center justify-center border border-border text-sm font-medium"
                >
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="text-xs text-muted-foreground">Görünüm</span>
          <ModeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
