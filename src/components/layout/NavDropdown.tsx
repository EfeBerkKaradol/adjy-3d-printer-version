"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SHOP_FALLBACK, type NavMenu, type NavMenuGroup } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// ==========================================
// DOCK AÇILIR MENÜSÜ
//
// Dock'taki bir başlığın üstüne gelince altında buzlu
// camdan bir panel açılır. Panel tek bir kutu: başlıklar
// arasında gezerken kapanıp açılmaz, yeni başlığın altına
// kayar ve genişliğini ona göre ayarlar.
//
// Panel dock'un İÇİNDE değil yanında çizilir: iç içe iki
// backdrop-filter'da içteki yalnızca dıştakinin içini
// bulanıklaştırır, dock'un dışına taşan panel saydam kalırdı.
// ==========================================

/** Ekran kenarından bırakılan boşluk (px) */
const KENAR = 16;

interface ApiCategory {
  name: string;
  slug: string;
  children?: { name: string; slug: string }[];
}

/** Mağaza menüsünün kategori sütunları — canlı ağaçtan, bir kez çekilir */
let shopCache: NavMenuGroup[] | null = null;

export function useShopGroups(enabled: boolean): NavMenuGroup[] {
  const [groups, setGroups] = useState<NavMenuGroup[]>(shopCache ?? SHOP_FALLBACK);

  useEffect(() => {
    if (!enabled || shopCache) return;
    let iptal = false;
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { categories?: ApiCategory[] } | null) => {
        const cats = data?.categories;
        if (!cats?.length) return;
        shopCache = cats.map((c) => ({
          title: c.name,
          href: `/products?category=${c.slug}`,
          links: (c.children ?? []).map((k) => ({
            label: k.name,
            href: `/products?category=${k.slug}`,
          })),
        }));
        if (!iptal) setGroups(shopCache);
      })
      .catch(() => {
        /* yedek liste kalır */
      });
    return () => {
      iptal = true;
    };
  }, [enabled]);

  return groups;
}

interface NavDropdownProps {
  /** Açık menü; null ise panel kapalı */
  open: { key: string; menu: NavMenu; center: number } | null;
  shopGroups: NavMenuGroup[];
  onEnter: () => void;
  onLeave: () => void;
  onNavigate: () => void;
}

export function NavDropdown({ open, shopGroups, onEnter, onLeave, onNavigate }: NavDropdownProps) {
  const reduce = useReducedMotion();
  const [vw, setVw] = useState(0);

  useEffect(() => {
    const olc = () => setVw(window.innerWidth);
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, []);

  let width = 0;
  let left = 0;
  if (open && vw) {
    width = Math.min(open.menu.width, vw - KENAR * 2);
    left = Math.min(Math.max(open.center - width / 2, KENAR), vw - KENAR - width);
  }

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.8 };

  return (
    <AnimatePresence>
      {open && vw > 0 && (
        <motion.div
          key="panel"
          // Üstteki boşluk görünmez bir köprü: imleç başlıktan
          // panele inerken menü kapanmaz
          className="pointer-events-auto absolute top-full pt-2.5"
          initial={{ opacity: 0, y: reduce ? 0 : -6, left, width }}
          animate={{ opacity: 1, y: 0, left, width }}
          exit={{ opacity: 0, y: reduce ? 0 : -6, transition: { duration: 0.14 } }}
          transition={{ ...spring, opacity: { duration: 0.16 } }}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
          onFocus={onEnter}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) onLeave();
          }}
        >
          <div
            id="dock-menu"
            role="menu"
            className="adjy-glass adjy-glass-menu overflow-hidden rounded-[22px]"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={open.key}
                initial={{ opacity: 0, x: reduce ? 0 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduce ? 0 : -8 }}
                transition={{ duration: 0.18 }}
              >
                <MenuBody
                  menu={open.menu}
                  shopGroups={shopGroups}
                  onNavigate={onNavigate}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuBody({
  menu,
  shopGroups,
  onNavigate,
}: {
  menu: NavMenu;
  shopGroups: NavMenuGroup[];
  onNavigate: () => void;
}) {
  const isShop = menu.kind === "shop";

  return (
    <div>
      <div className={cn("flex gap-2 p-3", isShop && "gap-3")}>
        {isShop ? (
          <>
            {/* Kategori sütunları */}
            <div className="grid flex-1 grid-cols-2 gap-x-2 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              {shopGroups.map((g) => (
                <Group key={g.title} group={g} onNavigate={onNavigate} compact />
              ))}
            </div>
            {/* Keşfet — buzlu karo üstünde */}
            <div className="adjy-glass-tile w-52 shrink-0 self-start rounded-[16px] p-1.5">
              {menu.groups.map((g) => (
                <Group key={g.title} group={g} onNavigate={onNavigate} />
              ))}
            </div>
          </>
        ) : (
          menu.groups.map((g) => (
            <div key={g.title} className="min-w-0 flex-1">
              <Group group={g} onNavigate={onNavigate} />
            </div>
          ))
        )}
      </div>

      {menu.footer && (
        <Link
          href={menu.footer.href}
          onClick={onNavigate}
          role="menuitem"
          className="group flex items-center justify-between border-t border-foreground/[0.07] px-5 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-white/30 hover:text-foreground dark:border-white/[0.07] dark:hover:bg-white/[0.04]"
        >
          {menu.footer.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function Group({
  group,
  onNavigate,
  compact = false,
}: {
  group: NavMenuGroup;
  onNavigate: () => void;
  compact?: boolean;
}) {
  const title = (
    <span className="block px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {group.title}
    </span>
  );

  return (
    <div className="min-w-0">
      {group.href ? (
        <Link
          href={group.href}
          onClick={onNavigate}
          role="menuitem"
          className="block rounded-[10px] transition-colors hover:bg-white/40 [&>span]:hover:text-foreground dark:hover:bg-white/[0.06]"
        >
          {title}
        </Link>
      ) : (
        title
      )}
      <ul>
        {group.links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              onClick={onNavigate}
              role="menuitem"
              className={cn(
                "block rounded-[12px] px-2.5 transition-colors hover:bg-white/45 dark:hover:bg-white/[0.07]",
                compact ? "py-1.5" : "py-2"
              )}
            >
              <span className="block text-sm text-foreground/85">{l.label}</span>
              {l.description && (
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                  {l.description}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
