import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

export async function GET() {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

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

  return NextResponse.json({
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
  });
}
