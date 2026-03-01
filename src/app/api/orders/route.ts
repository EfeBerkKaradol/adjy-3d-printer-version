import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createOrderSchema } from "@/lib/validations/order";
import { calculatePrice } from "@/lib/priceCalculator";
import { getShippingPrice } from "@/lib/shipping";
import { ZodError } from "zod";
import { sendOrderConfirmation } from "@/lib/email";

// ==========================================
// GET /api/orders
// Kullanıcının siparişlerini listeler.
// ==========================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
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
          select: {
            id: true,
            status: true,
            amount: true,
            cardLastFour: true,
            paidAt: true,
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
      { error: "Siparişler yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/orders
// Client-side sepet verisiyle sipariş oluşturur.
//
// Akış:
// 1. Auth kontrolü
// 2. Body'den sepet ürünlerini al
// 3. Sunucu tarafında fiyat doğrulaması yap
// 4. Kargo ücreti hesapla
// 5. Order + OrderItems oluştur (transaction)
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

    // Sipariş numarası üret
    const orderNumber = `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Ürünleri DB'den çekip fiyat doğrulaması yap
    const productIds = validatedData.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        basePrice: true,
        parameters: {
          select: {
            name: true,
            affectsPrice: true,
            priceFormula: true,
            defaultValue: true,
          },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // customizationId'lerin gerçekte DB'de var olduğunu doğrula
    const customizationIds = validatedData.items
      .map((i) => i.customizationId)
      .filter((id): id is string => !!id);

    const validCustomizationIds = new Set<string>();
    if (customizationIds.length > 0) {
      const existing = await prisma.customization.findMany({
        where: { id: { in: customizationIds } },
        select: { id: true },
      });
      existing.forEach((c) => validCustomizationIds.add(c.id));
    }

    // Transaction ile sipariş oluştur
    const order = await prisma.$transaction(async (tx) => {
      const itemsWithPrice = validatedData.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Ürün bulunamadı: ${item.productId}`);

        const basePrice = Number(product.basePrice);
        const customParams = item.customParams as Record<string, number | string> | null;

        // Sunucu tarafında fiyat hesapla (manipülasyon önleme)
        const unitPrice = customParams
          ? calculatePrice(basePrice, product.parameters, customParams)
          : basePrice;

        // customizationId sadece DB'de gerçekten varsa kullan
        const validCustId = item.customizationId && validCustomizationIds.has(item.customizationId)
          ? item.customizationId
          : undefined;

        return {
          productId: product.id,
          productName: product.name,
          customizationId: validCustId,
          customParams: customParams ?? undefined,
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
        };
      });

      // Toplam tutarı hesapla
      const totalAmount = itemsWithPrice.reduce(
        (sum, item) => sum + item.lineTotal,
        0
      );

      // Kargo ücreti
      const shippingCost = getShippingPrice(
        validatedData.shippingMethod,
        totalAmount
      );

      // Grand total
      const grandTotal = totalAmount + shippingCost;

      // Fatura adresi (aynı adres mi?)
      const billingAddress = validatedData.useSameAddress
        ? validatedData.shippingAddress
        : validatedData.billingAddress || validatedData.shippingAddress;

      // Order oluştur
      const newOrder = await tx.order.create({
        data: {
          userId: session.user!.id!,
          orderNumber,
          totalAmount,
          shippingCost,
          shippingMethod: validatedData.shippingMethod,
          grandTotal,
          notes: validatedData.notes,
          items: {
            create: itemsWithPrice,
          },
          address: {
            create: {
              shippingLine1: validatedData.shippingAddress.addressLine,
              shippingCity: validatedData.shippingAddress.city,
              shippingState: validatedData.shippingAddress.state,
              shippingZip: validatedData.shippingAddress.postalCode,
              shippingCountry: validatedData.shippingAddress.country,
              billingLine1: billingAddress.addressLine,
              billingCity: billingAddress.city,
              billingState: billingAddress.state,
              billingZip: billingAddress.postalCode,
              billingCountry: billingAddress.country,
            },
          },
          history: {
            create: {
              status: "PENDING",
              changedBy: "system",
              notes: "Sipariş oluşturuldu",
            },
          },
        },
        include: {
          items: true,
          address: true,
        },
      });

      return newOrder;
    });

    // E-posta bildirimi gönder (async, response'u bekletmez)
    const shippingAddr = validatedData.shippingAddress;
    sendOrderConfirmation({
      customerName: session.user?.name || "Müşteri",
      customerEmail: session.user?.email || "",
      orderNumber,
      orderId: order.id,
      items: order.items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      totalAmount: Number(order.totalAmount),
      shippingCost: Number(order.shippingCost),
      grandTotal: Number(order.grandTotal),
      shippingAddress: `${shippingAddr.addressLine}, ${shippingAddr.city}`,
    }).catch(() => {});

    return NextResponse.json(
      { message: "Sipariş oluşturuldu", order },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);

    if (error instanceof ZodError) {
      const messages = error.issues.map((e) => `${String(e.path?.join(".") ?? "")}: ${e.message}`);
      return NextResponse.json(
        { error: messages.join(", ") || "Geçersiz form bilgileri" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sipariş oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
