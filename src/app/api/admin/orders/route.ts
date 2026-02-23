import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { fullName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, email: true } },
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            printStatus: true,
          },
        },
        payments: {
          select: { status: true, paidAt: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount.toNumber(),
      shippingCost: o.shippingCost.toNumber(),
      grandTotal: o.grandTotal.toNumber(),
      shippingMethod: o.shippingMethod,
      customerName: o.user.fullName || o.user.email,
      customerEmail: o.user.email,
      itemCount: o.items.length,
      items: o.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toNumber(),
        lineTotal: i.lineTotal.toNumber(),
        printStatus: i.printStatus,
      })),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
