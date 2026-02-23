import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "ALL";

  const where: Record<string, unknown> = {};
  if (status !== "ALL") {
    where.printStatus = status;
  }

  const items = await prisma.orderItem.findMany({
    where,
    orderBy: { order: { createdAt: "desc" } },
    take: 100,
    include: {
      order: {
        select: {
          orderNumber: true,
          status: true,
          user: { select: { fullName: true, email: true } },
        },
      },
      product: { select: { name: true, thumbnailUrl: true } },
    },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      orderId: i.orderId,
      orderNumber: i.order.orderNumber,
      orderStatus: i.order.status,
      productName: i.productName,
      productThumbnail: i.product.thumbnailUrl,
      quantity: i.quantity,
      printStatus: i.printStatus,
      customParams: i.customParams,
      customerName: i.order.user.fullName || i.order.user.email,
    })),
  });
}

// Baskı durumu güncelleme
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const body = await request.json();
  const { itemId, printStatus } = body;

  const validStatuses = ["QUEUED", "PRINTING", "DONE", "FAILED"];
  if (!itemId || !validStatuses.includes(printStatus)) {
    return NextResponse.json(
      { error: "Geçersiz parametreler" },
      { status: 400 }
    );
  }

  const item = await prisma.orderItem.update({
    where: { id: itemId },
    data: { printStatus },
  });

  return NextResponse.json({
    message: "Baskı durumu güncellendi",
    item: { id: item.id, printStatus: item.printStatus },
  });
}
