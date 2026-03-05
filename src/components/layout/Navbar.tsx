"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/store/cartStore";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCart, Menu, ArrowRight, User, Package, MapPin, LogOut, Shield } from "lucide-react";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-orbitron)] font-extrabold text-2xl tracking-widest text-foreground">ADJY</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link
            href="/products"
            className="transition-colors hover:text-foreground/80 text-muted-foreground"
          >
            Ürünler
          </Link>
          <Link
            href="/products?featured=true"
            className="transition-colors hover:text-foreground/80 text-muted-foreground"
          >
            Öne Çıkanlar
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <ModeToggle />

          <Link href="/cart" className="relative group">
            <div data-cart-icon className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5 transition-colors group-hover:text-foreground" />
              </Button>
              {mounted && totalCount > 0 && (
                <span
                  data-cart-badge
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in pointer-events-none"
                >
                  {totalCount}
                </span>
              )}
            </div>
          </Link>

          {/* Desktop: Auth State */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:inline-flex rounded-full border border-border/40 hover:bg-accent">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{session?.user?.name || "Kullanıcı"}</p>
                  <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                {session?.user?.role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2 cursor-pointer text-orange-500 font-medium">
                      <Shield className="h-4 w-4" /> Admin Paneli
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" /> Profilim
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/orders" className="flex items-center gap-2 cursor-pointer">
                    <Package className="h-4 w-4" /> Siparişlerim
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/addresses" className="flex items-center gap-2 cursor-pointer">
                    <MapPin className="h-4 w-4" /> Adreslerim
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4" /> Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-white/10">
              <Link href="/login">
                Giriş Yap
              </Link>
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[75%] md:w-[60%] border-l border-white/10 bg-black/95 backdrop-blur-xl p-0">
              <SheetTitle className="sr-only">Navigasyon Menüsü</SheetTitle>

              <div className="flex flex-col h-full relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-white/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

                <div className="p-6 mt-10 flex flex-col gap-6 h-full z-10">
                  <Link href="/" onClick={closeMenu} className="flex items-center mb-2">
                    <span className="font-[family-name:var(--font-orbitron)] font-extrabold text-xl tracking-widest text-white">ADJY</span>
                  </Link>

                  <nav className="flex flex-col">
                    {[
                      { href: "/products", label: "Ürünler" },
                      { href: "/products?featured=true", label: "Öne Çıkanlar" },
                      ...(isLoggedIn
                        ? [
                          ...(session?.user?.role === "ADMIN"
                            ? [{ href: "/admin", label: "⚡ Admin Paneli" }]
                            : []),
                          { href: "/profile", label: "Profilim" },
                          { href: "/profile/orders", label: "Siparişlerim" },
                          { href: "/profile/addresses", label: "Adreslerim" },
                        ]
                        : [{ href: "/login", label: "Giriş Yap" }]),
                    ].map((item, index, arr) => (
                      <div key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className="group flex items-center justify-between py-4 text-lg font-light tracking-tight text-white/70 hover:text-white transition-colors"
                        >
                          <span>{item.label}</span>
                          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                        </Link>
                        {index < arr.length - 1 && (
                          <div className="h-px bg-white/10" />
                        )}
                      </div>
                    ))}
                  </nav>

                  <div className="mt-auto border-t border-white/10 pt-6">
                    {isLoggedIn ? (
                      <div className="flex flex-col gap-3">
                        <div className="px-1 mb-2">
                          <p className="text-white text-sm font-medium truncate">{session?.user?.name}</p>
                          <p className="text-white/50 text-xs truncate">{session?.user?.email}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button asChild variant="ghost" className="w-full h-10 text-sm border border-white/20 hover:bg-white/10 text-white">
                            <Link href="/cart" onClick={closeMenu}>Sepetim</Link>
                          </Button>
                          <Button
                            className="w-full h-10 text-sm bg-white text-black hover:bg-white/90"
                            onClick={() => {
                              closeMenu();
                              signOut({ callbackUrl: "/" });
                            }}
                          >
                            Çıkış Yap
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Button asChild variant="ghost" className="w-full h-10 text-sm border border-white/20 hover:bg-white/10 text-white">
                          <Link href="/cart" onClick={closeMenu}>Sepetim</Link>
                        </Button>
                        <Button asChild className="w-full h-10 text-sm bg-white text-black hover:bg-white/90">
                          <Link href="/login" onClick={closeMenu}>Giriş Yap</Link>
                        </Button>
                      </div>
                    )}
                    <p className="text-white/20 text-[10px] mt-6 text-center uppercase tracking-widest">
                      © 2026 <span className="font-[family-name:var(--font-orbitron)]">ADJY</span>
                    </p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
