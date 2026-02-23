"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Printer,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart },
  { href: "/admin/products", label: "Ürünler", icon: Package },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/print-queue", label: "Baskı Kuyruğu", icon: Printer },
  { href: "/admin/reports", label: "Raporlar", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r border-border/40 bg-card/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border/40">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl font-bold font-[var(--font-orbitron)] tracking-wider">
            ADJY
          </span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            Admin
          </span>
        </Link>
      </div>

      {/* Menü */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mağazaya Dön */}
      <div className="p-4 border-t border-border/40">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Mağazaya Dön
        </Link>
      </div>
    </aside>
  );
}
