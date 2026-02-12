"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Package,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockUser } from "@/lib/mock-data";

const sidebarLinks = [
  { href: "/hesap", label: "Profilim", icon: User, exact: true },
  { href: "/hesap/siparisler", label: "Siparislerim", icon: Package, exact: false },
  { href: "/hesap/adresler", label: "Adreslerim", icon: MapPin, exact: false },
  { href: "/hesap/ayarlar", label: "Ayarlar", icon: Settings, exact: false },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Ana Sayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Hesabim</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:w-72 flex-shrink-0"
          >
            {/* User card */}
            <div className="glass rounded-xl p-6 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {mockUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {mockUser.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {mockUser.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="glass rounded-xl p-2 space-y-1">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href, link.exact);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-primary/15 to-accent/15 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5",
                        active ? "text-primary" : ""
                      )}
                    />
                    {link.label}
                    {active && (
                      <motion.div
                        layoutId="account-active"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-accent"
                      />
                    )}
                  </Link>
                );
              })}

              <div className="border-t border-border my-2" />

              <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 w-full">
                <LogOut className="h-4.5 w-4.5" />
                Cikis Yap
              </button>
            </nav>
          </motion.aside>

          {/* Main content */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}
