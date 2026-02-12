"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardStats, mockOrders, mockProducts } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

const statCards = [
  {
    label: "Gunluk Satis",
    value: formatPrice(dashboardStats.dailySales),
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    label: "Yeni Siparisler",
    value: dashboardStats.newOrders.toString(),
    change: "+3",
    trend: "up" as const,
    icon: ShoppingCart,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    label: "Aktif Urunler",
    value: dashboardStats.activeProducts.toString(),
    change: "+8",
    trend: "up" as const,
    icon: Package,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    label: "Ziyaretciler",
    value: dashboardStats.visitors.toLocaleString("tr-TR"),
    change: "-2.4%",
    trend: "down" as const,
    icon: Users,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Bekliyor", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  processing: { label: "Hazirlaniyor", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  printing: { label: "Basiliyor", className: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  shipped: { label: "Kargoda", className: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30" },
  delivered: { label: "Teslim Edildi", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  cancelled: { label: "Iptal", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function AdminDashboardPage() {
  const maxSales = Math.max(
    ...dashboardStats.monthlySales.map((m) => m.sales)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Merhaba Efe, maginizin genel durumuna goz atin.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-11 h-11 rounded-xl ${stat.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trend === "up"
                      ? "text-emerald-500"
                      : "text-destructive"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Chart (placeholder bar chart) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="xl:col-span-2 glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold font-heading text-foreground">
              Aylik Satis Trendi
            </h2>
            <Badge variant="outline" className="text-xs">
              2026
            </Badge>
          </div>
          <div className="flex items-end gap-2 h-48">
            {dashboardStats.monthlySales.map((month, i) => {
              const height = (month.sales / maxSales) * 100;
              return (
                <motion.div
                  key={month.month}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.6 + i * 0.05, duration: 0.5 }}
                  className="flex-1 group relative"
                >
                  <div
                    className="w-full h-full rounded-t-md bg-gradient-to-t from-primary/80 to-accent/80 hover:from-primary hover:to-accent transition-colors cursor-pointer"
                    title={`${month.month}: ${formatPrice(month.sales)}`}
                  />
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    {month.month}
                  </p>
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10">
                    {formatPrice(month.sales)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold font-heading text-foreground mb-6">
            Kategori Dagilimi
          </h2>
          <div className="space-y-4">
            {dashboardStats.categorySales.map((cat, i) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-foreground">{cat.category}</span>
                  <span className="text-muted-foreground font-medium">
                    %{cat.value}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.value}%` }}
                    transition={{ delay: 0.7 + i * 0.1, duration: 0.6 }}
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-heading text-foreground">
              Son Siparisler
            </h2>
            <Link href="/admin/siparisler">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Tumunu Gor
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {mockOrders.slice(0, 4).map((order) => {
              const status = statusConfig[order.status];
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.date).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${status.className}`}
                    >
                      {status.label}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-heading text-foreground">
              En Cok Satan Urunler
            </h2>
            <Link href="/admin/urunler">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Tumunu Gor
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {mockProducts.slice(0, 4).map((product, i) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.reviewCount} yorum
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatPrice(product.price)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
