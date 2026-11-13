"use client";

import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useClientState";
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
import { Dock, DockItem } from "./Dock";
import { NavDropdown, useShopGroups } from "./NavDropdown";
import { MAIN_NAV, type NavMenu } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
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
// ADJY HEADER — DOCK
// Sayfanın üstünde yüzen, macOS Dock'u gibi tek parça
// buzlu bir cam şerit: logo · ana navigasyon · eylemler.
// Arkasından kayan içerik bulanık görünür; imleç üstünde
// gezdikçe öğeler Dock'taki gibi büyür (bkz. Dock.tsx).
// Mobilde aynı cam şerit ekran genişliğine yayılır.
// ==========================================

/** iOS ikon zemini gibi buzlu kare düğme */
const TILE =
  "adjy-glass-tile flex h-10 w-10 items-center justify-center rounded-[13px] text-foreground/75 transition-colors hover:text-foreground";

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const items = useCartStore((s) => s.items);
  const mounted = useHydrated();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Açılır menü: hangi başlık açık, panel nerede ortalanacak
  const [dropdown, setDropdown] = useState<{
    key: string;
    menu: NavMenu;
    center: number;
  } | null>(null);
  const closeTimer = useRef<number | null>(null);
  const shopGroups = useShopGroups(dropdown !== null);

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openMenu = (key: string, menu: NavMenu, el: HTMLElement) => {
    cancelClose();
    const r = el.getBoundingClientRect();
    setDropdown({ key, menu, center: r.left + r.width / 2 });
  };
  // Kısa bir gecikme: imleç başlıktan panele inerken ya da
  // iki başlık arasından geçerken menü kapanıp açılmasın
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setDropdown(null), 160);
  };
  const closeNow = () => {
    cancelClose();
    setDropdown(null);
  };

  // Sayfa değişince menüyü kapat; Esc ile de kapanır
  useEffect(() => {
    closeNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!dropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdown]);
  useEffect(() => cancelClose, []);

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

      {/* Dış kap şeffaf: yalnızca cam şerit tıklanabilir, kenarlardan
          arkadaki içerik görünmeye ve tıklanmaya devam eder */}
      <header className="pointer-events-none sticky top-0 z-50 w-full px-3 pt-3 md:px-4 md:pt-4">
        <Dock
          role="toolbar"
          aria-label="Site menüsü"
          className="pointer-events-auto mx-auto w-full max-w-[var(--container-max)] gap-1 rounded-[22px] px-2 py-1.5 md:gap-1.5 md:rounded-[24px] md:px-3 md:py-2"
        >
          {/* Logo */}
          <DockItem max={1.18}>
            <Link
              href="/"
              className="flex h-10 items-center rounded-[14px] px-3 font-[family-name:var(--font-orbitron)] text-lg font-extrabold tracking-[0.22em] transition-opacity hover:opacity-70 md:text-xl"
              aria-label="ADJY ana sayfa"
            >
              ADJY
            </Link>
          </DockItem>

          <span className="hidden flex-1 md:block" aria-hidden />

          {/* Ana navigasyon — başlıkların üstüne gelince menü açılır */}
          <nav className="hidden items-center gap-1 md:flex lg:gap-2" aria-label="Ana navigasyon">
            {MAIN_NAV.map((link) => {
              const active = isActive(link.href);
              const menu = link.menu;
              const expanded = dropdown?.key === link.href;
              return (
                <DockItem key={link.href} max={1.22}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    aria-haspopup={menu ? "menu" : undefined}
                    aria-expanded={menu ? expanded : undefined}
                    aria-controls={menu && expanded ? "dock-menu" : undefined}
                    onPointerEnter={(e) => {
                      if (e.pointerType !== "mouse") return;
                      if (menu) openMenu(link.href, menu, e.currentTarget);
                      else scheduleClose();
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") scheduleClose();
                    }}
                    onFocus={(e) => menu && openMenu(link.href, menu, e.currentTarget)}
                    onClick={closeNow}
                    className={cn(
                      "relative flex h-10 items-center gap-1 rounded-[14px] px-3.5 text-sm transition-colors",
                      active
                        ? "adjy-glass-tile font-medium text-foreground"
                        : expanded
                          ? "bg-white/40 text-foreground dark:bg-white/[0.06]"
                          : "text-muted-foreground hover:bg-white/40 hover:text-foreground dark:hover:bg-white/[0.06]"
                    )}
                  >
                    {link.label}
                    {menu && (
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "-mr-1 h-3.5 w-3.5 opacity-50 transition-transform duration-200",
                          expanded && "rotate-180 opacity-80"
                        )}
                      />
                    )}
                    {/* Dock'taki "açık uygulama" noktası */}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute -bottom-[5px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground/70"
                      />
                    )}
                  </Link>
                </DockItem>
              );
            })}
          </nav>

          <span className="flex-1" aria-hidden />

          {/* Eylemler — iOS ikonları gibi buzlu karolar */}
          <DockItem>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Ara"
              className={TILE}
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          </DockItem>

          <DockItem className="hidden md:block">
            <ModeToggle className={TILE} />
          </DockItem>

          {/* Hesap — masaüstü */}
          <DockItem className="hidden md:block">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Hesap menüsü" className={TILE}>
                    <User className="h-[18px] w-[18px]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="w-56">
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
                className="adjy-glass-tile flex h-10 items-center rounded-[13px] px-3.5 text-sm text-foreground/80 transition-colors hover:text-foreground"
              >
                Giriş
              </Link>
            )}
          </DockItem>

          {/* Sepet */}
          <DockItem>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={cartCount > 0 ? `Sepet, ${cartCount} ürün` : "Sepet, boş"}
              className={TILE}
            >
              <span data-cart-icon className="relative flex items-center justify-center">
                <ShoppingBag className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <span
                    data-cart-badge
                    className="pointer-events-none absolute -right-2.5 -top-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground shadow-sm"
                  >
                    {cartCount}
                  </span>
                )}
              </span>
            </button>
          </DockItem>

          {/* Mobil menü */}
          <DockItem className="md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menüyü aç"
              className={TILE}
            >
              <Menu className="h-5 w-5" />
            </button>
          </DockItem>
        </Dock>

        <NavDropdown
          open={dropdown}
          shopGroups={shopGroups}
          onEnter={cancelClose}
          onLeave={scheduleClose}
          onNavigate={closeNow}
        />
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
