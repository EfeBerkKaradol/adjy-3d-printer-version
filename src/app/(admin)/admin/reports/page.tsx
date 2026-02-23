"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, ShoppingCart, Users, Package } from "lucide-react";

interface Stats {
  totalOrders: number;
  monthlyOrders: number;
  orderGrowth: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  totalProducts: number;
  pendingOrders: number;
  printingItems: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

export default function AdminReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch {
        // Hata
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Rapor verileri yüklenemedi.
      </div>
    );
  }

  const reportCards = [
    {
      title: "Toplam Gelir",
      value: formatCurrency(stats.totalRevenue),
      sub: `Bu ay: ${formatCurrency(stats.monthlyRevenue)}`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Toplam Sipariş",
      value: stats.totalOrders.toString(),
      sub: `Bu ay: ${stats.monthlyOrders} (%${stats.orderGrowth >= 0 ? "+" : ""}${stats.orderGrowth})`,
      icon: ShoppingCart,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Toplam Kullanıcı",
      value: stats.totalUsers.toString(),
      sub: "Kayıtlı hesaplar",
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Aktif Ürün",
      value: stats.totalProducts.toString(),
      sub: "Yayında olan ürünler",
      icon: Package,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Raporlar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mağaza performans metrikleri ve özet rapor
        </p>
      </div>

      {/* Rapor Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-card border border-border/40 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {card.title}
                </span>
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Özet Bilgileri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border/40 rounded-xl p-6">
          <h3 className="font-semibold mb-4">Sipariş Durumu Dağılımı</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Bekleyen / Onaylanan
              </span>
              <span className="font-medium">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Baskıda / Kuyrukta
              </span>
              <span className="font-medium">{stats.printingItems}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Ortalama Sipariş Tutarı
              </span>
              <span className="font-medium">
                {stats.totalOrders > 0
                  ? formatCurrency(stats.totalRevenue / stats.totalOrders)
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-xl p-6">
          <h3 className="font-semibold mb-4">Aylık Performans</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Bu Ay Gelir
              </span>
              <span className="font-medium">
                {formatCurrency(stats.monthlyRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Bu Ay Sipariş
              </span>
              <span className="font-medium">{stats.monthlyOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Büyüme Oranı
              </span>
              <span
                className={`font-medium ${stats.orderGrowth >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                %{stats.orderGrowth >= 0 ? "+" : ""}
                {stats.orderGrowth}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
