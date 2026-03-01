import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { getFromCache, setCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  // Cache kontrol
  const cached = await getFromCache(CACHE_KEYS.ADMIN_STATS);
  if (cached) {
    return NextResponse.json(cached);
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalOrders,
    monthlyOrders,
    lastMonthOrders,
    totalRevenue,
    monthlyRevenue,
    totalUsers,
    totalProducts,
    pendingOrders,
    printingItems,
    recentOrders,
  ] = await Promise.all([
    // Toplam sipariş
    prisma.order.count(),
    // Bu ay sipariş
    prisma.order.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    // Geçen ay sipariş
    prisma.order.count({
      where: {
        createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
    }),
    // Toplam gelir (ödenen)
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: { paymentStatus: "PAID" },
    }),
    // Bu ay gelir
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: startOfMonth },
      },
    }),
    // Toplam kullanıcı
    prisma.user.count(),
    // Toplam ürün
    prisma.product.count({ where: { isActive: true } }),
    // Bekleyen siparişler
    prisma.order.count({
      where: { status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    // Baskıda olan ürünler
    prisma.orderItem.count({
      where: { printStatus: { in: ["QUEUED", "PRINTING"] } },
    }),
    // Son 10 sipariş
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, email: true } },
        items: { select: { id: true } },
      },
    }),
  ]);

  // Aylık değişim oranı
  const orderGrowth =
    lastMonthOrders > 0
      ? Math.round(((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100)
      : monthlyOrders > 0
        ? 100
        : 0;

  // Grafik verileri: Son 30 gun gelir + siparis sayisi
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyData = await prisma.$queryRaw<Array<{ date: string; revenue: number; order_count: number }>>`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM-DD') as date,
      COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN grand_total ELSE 0 END), 0)::float as revenue,
      COUNT(*)::int as order_count
    FROM orders
    WHERE created_at >= ${thirtyDaysAgo}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date ASC
  `;

  // Siparis durum dagilimi
  const statusDistribution = await prisma.order.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const statusLabels: Record<string, string> = {
    PENDING: "Beklemede",
    CONFIRMED: "Onaylandi",
    PROCESSING: "Isleniyor",
    PRINTING: "Yazdiriliyor",
    QUALITY_CHECK: "Kalite Kontrol",
    PACKAGING: "Paketleniyor",
    SHIPPED: "Kargoda",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "Iptal",
  };

  const response = {
    stats: {
      totalOrders,
      monthlyOrders,
      orderGrowth,
      totalRevenue: totalRevenue._sum.grandTotal?.toNumber() || 0,
      monthlyRevenue: monthlyRevenue._sum.grandTotal?.toNumber() || 0,
      totalUsers,
      totalProducts,
      pendingOrders,
      printingItems,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      grandTotal: o.grandTotal.toNumber(),
      itemCount: o.items.length,
      customerName: o.user.fullName || o.user.email,
      createdAt: o.createdAt.toISOString(),
    })),
    charts: {
      dailyRevenue: dailyData.map((d) => ({
        date: d.date,
        revenue: Number(d.revenue),
        orderCount: Number(d.order_count),
      })),
      statusDistribution: statusDistribution.map((s) => ({
        name: statusLabels[s.status] || s.status,
        value: s._count.id,
        status: s.status,
      })),
    },
  };

  await setCache(CACHE_KEYS.ADMIN_STATS, response, CACHE_TTL.ADMIN_STATS);
  return NextResponse.json(response);
}
