import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createOrderSchema } from "@/lib/validations/order";

// ==========================================
// GET /api/orders
// Kullanıcının siparişlerini listeler.
// ==========================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giris yapmaniz gerekiyor" },
        { status: 401 }
      );
    }

    // [GÖREV 16]: Kullanıcının siparişlerini çek
    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            printStatus: true,
          },
        },
        shipment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: "Siparisler yuklenirken bir hata olustu" },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/orders
// Sepetteki ürünlerden yeni sipariş oluşturur.
//
// Akış:
// 1. Auth kontrolü
// 2. Sepetteki ürünleri çek
// 3. Fiyatları hesapla
// 4. Order + OrderItems oluştur (transaction)
// 5. Sepeti temizle
// 6. Sipariş numarası üret
// ==========================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giris yapmaniz gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    // [GÖREV 17]: Sepetteki ürünleri çek
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: { id: true, name: true, basePrice: true },
        },
        customization: true,
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: "Sepetiniz bos" },
        { status: 400 }
      );
    }

    // [GÖREV 18]: Sipariş numarası üret
    const orderNumber = `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // [GÖREV 19]: Transaction ile sipariş oluştur
    const order = await prisma.$transaction(async (tx) => {
      // 1. Toplam tutarı hesapla
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.product.basePrice) * item.quantity,
        0
      );

      // 2. Order + OrderItems + OrderAddress oluştur
      const newOrder = await tx.order.create({
        data: {
          userId: session.user!.id!,
          orderNumber,
          totalAmount,
          grandTotal: totalAmount,
          items: {
            create: cartItems.map((item) => ({
              productId: item.product.id,
              productName: item.product.name,
              customizationId: item.customizationId,
              customParams: item.customization?.parameters ?? undefined,
              quantity: item.quantity,
              unitPrice: item.product.basePrice,
              lineTotal: Number(item.product.basePrice) * item.quantity,
            })),
          },
          address: {
            create: {
              shippingLine1: validatedData.shippingAddress.addressLine,
              shippingCity: validatedData.shippingAddress.city,
              shippingState: validatedData.shippingAddress.state,
              shippingZip: validatedData.shippingAddress.postalCode,
              shippingCountry: validatedData.shippingAddress.country,
              billingLine1: validatedData.shippingAddress.addressLine,
              billingCity: validatedData.shippingAddress.city,
              billingState: validatedData.shippingAddress.state,
              billingZip: validatedData.shippingAddress.postalCode,
              billingCountry: validatedData.shippingAddress.country,
            },
          },
          history: {
            create: {
              status: "PENDING",
              changedBy: "system",
              notes: "Siparis olusturuldu",
            },
          },
        },
        include: {
          items: true,
          address: true,
        },
      });

      // 3. Sepeti temizle
      await tx.cartItem.deleteMany({
        where: { userId: session.user!.id! },
      });

      return newOrder;
    });

    return NextResponse.json(
      { message: "Siparis olusturuldu", order },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Siparis olusturulurken bir hata olustu" },
      { status: 500 }
    );
  }
}
