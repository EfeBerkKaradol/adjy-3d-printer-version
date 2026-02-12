"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  CreditCard,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockUser, mockOrders } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

const quickStats = [
  {
    label: "Toplam Siparis",
    value: mockUser.totalOrders,
    icon: Package,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "Toplam Harcama",
    value: formatPrice(mockUser.totalSpent),
    icon: CreditCard,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    label: "Uyelik Tarihi",
    value: new Date(mockUser.joinDate).toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric",
    }),
    icon: CalendarDays,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Onay Bekliyor", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  processing: { label: "Hazirlaniyor", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  printing: { label: "Basiliyor", className: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  shipped: { label: "Kargoda", className: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30" },
  delivered: { label: "Teslim Edildi", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  cancelled: { label: "Iptal", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function ProfilePage() {
  const recentOrders = mockOrders.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Profilim
        </h1>
        <p className="text-muted-foreground mt-1">
          Hesap bilgilerinizi ve siparis ozetinizi goruntueleyin
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold font-heading text-foreground">
            Kisisel Bilgiler
          </h2>
          <Button variant="outline" size="sm">
            Duzenle
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ad Soyad</p>
            <p className="text-foreground font-medium">{mockUser.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">E-posta</p>
            <p className="text-foreground font-medium">{mockUser.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Telefon</p>
            <p className="text-foreground font-medium">+90 532 *** ** 45</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Uyelik Tarihi</p>
            <p className="text-foreground font-medium">
              {new Date(mockUser.joinDate).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold font-heading text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Son Siparisler
          </h2>
          <Link href="/hesap/siparisler">
            <Button variant="ghost" size="sm" className="gap-1">
              Tumunu Gor
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {recentOrders.map((order) => {
            const status = statusConfig[order.status];
            return (
              <Link
                key={order.id}
                href={`/hesap/siparisler/${order.id}`}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Package className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.date).toLocaleDateString("tr-TR")} -{" "}
                      {order.items.length} urun
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`text-xs ${status.className}`}
                  >
                    {status.label}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {formatPrice(order.total)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Link
          href="/urunler"
          className="glass rounded-xl p-5 flex items-center gap-4 hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Alisverise Devam Et</p>
            <p className="text-sm text-muted-foreground">
              Yeni urunleri kesfet
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          href="/hesap/adresler"
          className="glass rounded-xl p-5 flex items-center gap-4 hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">Adreslerimi Yonet</p>
            <p className="text-sm text-muted-foreground">
              Teslimat adreslerini duzenle
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </div>
  );
}
