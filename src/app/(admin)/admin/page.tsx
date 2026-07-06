"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  Printer,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Globe,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/admin/charts/RevenueChart";
import { OrderStatusChart } from "@/components/admin/charts/OrderStatusChart";
import { DailyOrdersChart } from "@/components/admin/charts/DailyOrdersChart";
import { VisitorsChart } from "@/components/admin/charts/VisitorsChart";

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

interface Charts {
  dailyRevenue: Array<{ date: string; revenue: number; orderCount: number }>;
  statusDistribution: Array<{ name: string; value: number; status: string }>;
}

interface VisitStats {
  totalPageviews: number;
  totalVisitors: number;
  daily: Array<{ date: string; pageviews: number; visitors: number }>;
}

interface AnalyticsResponse {
  configured: boolean;
  visits: VisitStats | null;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  itemCount: number;
  customerName: string;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  PROCESSING: "İşleniyor",
  PRINTING: "Baskıda",
  QUALITY_CHECK: "Kalite Kontrol",
  PACKAGING: "Paketleniyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500",
  CONFIRMED: "bg-blue-500/10 text-blue-500",
  PROCESSING: "bg-indigo-500/10 text-indigo-500",
  PRINTING: "bg-purple-500/10 text-purple-500",
  QUALITY_CHECK: "bg-cyan-500/10 text-cyan-500",
  PACKAGING: "bg-orange-500/10 text-orange-500",
  SHIPPED: "bg-teal-500/10 text-teal-500",
  DELIVERED: "bg-green-500/10 text-green-500",
  CANCELLED: "bg-red-500/10 text-red-500",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecentOrders(data.recentOrders);
          setCharts(data.charts);
        } else {
          const data = await res.json().catch(() => null);
          if (res.status === 401 || res.status === 403) {
            setError("Oturum süreniz dolmuş olabilir. Sayfayı yenileyin veya tekrar giriş yapın.");
          } else {
            setError(data?.error || `Sunucu hatası (${res.status})`);
          }
        }
      } catch {
        setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    }

    // Ziyaret verileri ayrı yüklenir — Vercel API yavaşsa dashboard'u bekletmez
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) {
          setAnalytics(await res.json());
        }
      } catch {
        // Analytics yüklenemezse bölüm sessizce gizlenir
      }
    }

    fetchStats();
    fetchAnalytics();
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
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground">İstatistikler yüklenemedi.</p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mağaza genel bakış ve istatistikler
        </p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Gelir */}
        <div className="bg-card border border-border/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Toplam Gelir</span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Bu ay: {formatCurrency(stats.monthlyRevenue)}
          </p>
        </div>

        {/* Siparişler */}
        <div className="bg-card border border-border/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Siparişler</span>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
          <div className="flex items-center gap-1 mt-1">
            {stats.orderGrowth >= 0 ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span
              className={`text-xs ${stats.orderGrowth >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              %{Math.abs(stats.orderGrowth)} bu ay
            </span>
          </div>
        </div>

        {/* Kullanıcılar */}
        <div className="bg-card border border-border/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Kullanıcılar</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalProducts} aktif ürün
          </p>
        </div>

        {/* Bekleyen İşler */}
        <div className="bg-card border border-border/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Bekleyen</span>
            <Clock className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold">{stats.pendingOrders}</p>
          <div className="flex items-center gap-1 mt-1">
            <Printer className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {stats.printingItems} baskıda
            </span>
          </div>
        </div>
      </div>

      {/* Hızlı İşlemler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/orders?status=PENDING">
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 hover:bg-yellow-500/10 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Bekleyen Siparişler</p>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingOrders} sipariş onay bekliyor
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/print-queue">
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 hover:bg-purple-500/10 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Printer className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Baskı Kuyruğu</p>
                <p className="text-xs text-muted-foreground">
                  {stats.printingItems} ürün baskıda/kuyrukta
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/products">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 hover:bg-blue-500/10 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Ürün Yönetimi</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalProducts} aktif ürün
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Site Ziyaretleri (Vercel Web Analytics) */}
      {analytics?.configured && analytics.visits && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Site Ziyaretleri</h2>
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Son 30 Gün — Vercel Web Analytics
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">
                      {analytics.visits.totalVisitors.toLocaleString("tr-TR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ziyaretçi</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">
                      {analytics.visits.totalPageviews.toLocaleString("tr-TR")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Görüntülenme</p>
                  </div>
                </div>
              </div>
            </div>
            <VisitorsChart data={analytics.visits.daily} />
          </div>
        </div>
      )}

      {/* Analytics yapılandırılmamışsa kurulum ipucu */}
      {analytics && !analytics.configured && (
        <div className="border border-dashed border-border/60 rounded-xl p-5 flex items-start gap-3">
          <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Site ziyaret istatistikleri yapılandırılmamış</p>
            <p className="text-muted-foreground mt-1">
              Ziyaretçi sayılarını burada görmek için{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VERCEL_API_TOKEN</code> ve{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VERCEL_PROJECT_ID</code>{" "}
              env değişkenlerini ekleyin, Vercel panelinden Web Analytics&apos;i etkinleştirin.
            </p>
          </div>
        </div>
      )}

      {/* Grafikler */}
      {charts && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Son 30 Gün</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gelir Grafiği */}
            <div className="bg-card border border-border/40 rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Günlük Gelir
              </h3>
              <RevenueChart data={charts.dailyRevenue} />
            </div>

            {/* Günlük Sipariş Grafiği */}
            <div className="bg-card border border-border/40 rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Günlük Sipariş Sayısı
              </h3>
              <DailyOrdersChart data={charts.dailyRevenue} />
            </div>
          </div>

          {/* Sipariş Durum Dağılımı */}
          <div className="bg-card border border-border/40 rounded-xl p-5 max-w-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Sipariş Durum Dağılımı
            </h3>
            <OrderStatusChart data={charts.statusDistribution} />
          </div>
        </div>
      )}

      {/* Son Siparişler */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Son Siparişler</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders">Tümünü Gör</Link>
          </Button>
        </div>

        <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Sipariş No
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Müşteri
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Durum
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Tutar
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Henüz sipariş yok
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.customerName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            statusColors[order.status] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(order.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
