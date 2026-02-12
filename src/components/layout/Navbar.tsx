"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Menu, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export function Navbar() {
  const totalItems = useCartStore((state) => state.totalItems);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight">
          <span className="text-foreground">ADJY</span>
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
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5 transition-colors group-hover:text-foreground" />
              {totalItems() > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                  {totalItems()}
                </span>
              )}
            </Button>
          </Link>

          <Button asChild variant="default" className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-white/10">
            <Link href="/login">
              Giriş Yap
            </Link>
          </Button>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[60%] border-l border-white/10 bg-black/90 backdrop-blur-xl p-0">
              <SheetTitle className="sr-only">Navigasyon Menüsü</SheetTitle>

              <div className="flex flex-col h-full relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-white/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

                <div className="p-6 mt-10 flex flex-col gap-6 h-full z-10">
                  <Link href="/" className="flex items-center font-bold text-xl tracking-tighter mb-2">
                    <span className="text-white">ADJY</span>
                  </Link>

                  <nav className="flex flex-col">
                    {[
                      { href: "/products", label: "Ürünler" },
                      { href: "/products?featured=true", label: "Öne Çıkanlar" },
                      { href: "/login", label: "Giriş Yap" },
                    ].map((item, index, arr) => (
                      <div key={item.href}>
                        <Link
                          href={item.href}
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
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="w-full h-10 text-sm border-white/10 hover:bg-white/5 hover:text-white text-white/60">
                        Hesabım
                      </Button>
                      <Button className="w-full h-10 text-sm bg-white text-black hover:bg-white/90">
                        Sepete Git
                      </Button>
                    </div>
                    <p className="text-white/20 text-[10px] mt-6 text-center uppercase tracking-widest">
                      © 2024 ADJY
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
