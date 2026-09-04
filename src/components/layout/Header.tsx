"use client";

import { useEffect, useState } from "react";
import { useHydrated, useScrolled } from "@/hooks/useClientState";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/store/cartStore";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchOverlay } from "./SearchOverlay";
import { MobileNav } from "./MobileNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MAIN_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  Shield,
  ShoppingBag,
  User,
} from "lucide-react";

// ==========================================
// ADJY HEADER
// Sol: logo · Orta: Mağaza / Özelleştir / Üret / Koleksiyonlar
// Sağ: arama, hesap, sepet.
// Sayfa kaydırıldığında yükseklik daralır, ince bir
// ayraç ve hafif bulanıklık devreye girer.
// ==========================================

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const items = useCartStore((s) => s.items);
  const mounted = useHydrated();
  const scrolled = useScrolled();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Cmd/Ctrl+K ile aramayı aç
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sepet sayısı yalnızca istemcide bilinir (localStorage)
  const cartCount = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  function isActive(href: string) {
    const base = href.split("?")[0];
    if (base === "/products") return pathname === "/products";
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        İçeriğe geç
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-[height,background-color,border-color] duration-300",
          scrolled
            ? "border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75"
            : "border-b border-transparent bg-background"
        )}
      >
        <div
          className={cn(
            "adjy-container flex items-center justify-between transition-[height] duration-300",
            scrolled ? "h-14" : "h-16 md:h-[72px]"
          )}
        >
          {/* Sol — logo */}
          <div className="flex flex-1 items-center">
            <Link
              href="/"
              className="font-[family-name:var(--font-orbitron)] text-xl font-extrabold tracking-[0.22em] transition-opacity hover:opacity-70 md:text-[22px]"
              aria-label="ADJY ana sayfa"
            >
              ADJY
            </Link>
          </div>

          {/* Orta — ana navigasyon */}
          <nav
            className="hidden items-center gap-9 md:flex"
            aria-label="Ana navigasyon"
          >
            {MAIN_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "relative py-1 text-sm transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-200 hover:after:scale-x-100",
                  isActive(link.href)
                    ? "font-medium text-foreground after:scale-x-100"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Sağ — arama, hesap, sepet */}
          <div className="flex flex-1 items-center justify-end gap-1 md:gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Ara"
              className="flex h-10 w-10 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            <div className="hidden md:block">
              <ModeToggle />
            </div>

            {/* Hesap — masaüstü */}
            <div className="hidden md:block">
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Hesap menüsü"
                      className="flex h-10 w-10 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <User className="h-[18px] w-[18px]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="truncate text-sm font-medium">
                        {session?.user?.name || "Kullanıcı"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session?.user?.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    {session?.user?.role === "ADMIN" && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/admin"
                          className="flex cursor-pointer items-center gap-2 font-medium text-brand-amber"
                        >
                          <Shield className="h-4 w-4" /> Admin Paneli
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                        <User className="h-4 w-4" /> Profilim
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile/orders"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Package className="h-4 w-4" /> Siparişlerim
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile/addresses"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" /> Adreslerim
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <LogOut className="h-4 w-4" /> Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href="/login"
                  className="ml-1 inline-flex h-9 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Giriş
                </Link>
              )}
            </div>

            {/* Sepet */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={
                cartCount > 0 ? `Sepet, ${cartCount} ürün` : "Sepet, boş"
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span data-cart-icon className="relative flex items-center justify-center">
                <ShoppingBag className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <span
                    data-cart-badge
                    className="pointer-events-none absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground"
                  >
                    {cartCount}
                  </span>
                )}
              </span>
            </button>

            {/* Mobil menü */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menüyü aç"
              className="flex h-10 w-10 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
