import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { initializeCheckoutForm } from "@/lib/iyzico";
import { rateLimit } from "@/lib/rate-limit";
import { getAbsoluteUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    // Rate limit: 5 odeme/dk per user
    const { success } = await rateLimit(`payment:${session.user.id}`, { windowMs: 60_000, max: 5 });
    if (!success) {
      return NextResponse.json({ error: "Cok fazla istek. Lutfen bekleyin." }, { status: 429 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Sipariş ID gerekli" },
        { status: 400 }
      );
    }

    // Siparişi bul
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
        address: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı" },
        { status: 404 }
      );
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Bu sipariş zaten ödenmiş" },
        { status: 400 }
      );
    }

    // Conversation ID (unique)
    const conversationId = `adjy_${order.id}_${Date.now()}`;

    // IP adresi al
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Buyer bilgileri
    const fullName = order.user.fullName || "Müşteri";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "Müşteri";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Callback URL
    const callbackUrl = `${getAbsoluteUrl()}/api/payments/callback`;

    // Basket items
    const basketItems = order.items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      category1: item.product.category?.name || "3D Baskı",
      itemType: "PHYSICAL" as const,
      price: Number(item.lineTotal).toFixed(2),
    }));

    // Kargo da basket item olarak eklenmeli (iyzico gereksinimi: toplam = ürün toplamı)
    if (Number(order.shippingCost) > 0) {
      basketItems.push({
        id: "shipping",
        name: "Kargo Ücreti",
        category1: "Kargo",
        itemType: "PHYSICAL" as const,
        price: Number(order.shippingCost).toFixed(2),
      });
    }

    // iyzico Checkout Form başlat
    const result = await initializeCheckoutForm({
      conversationId,
      price: Number(order.grandTotal).toFixed(2),
      paidPrice: Number(order.grandTotal).toFixed(2),
      currency: "TRY",
      basketId: order.id,
      paymentGroup: "PRODUCT",
      callbackUrl,
      buyer: {
        id: order.user.id,
        name: firstName,
        surname: lastName,
        email: order.user.email || "customer@adjy.com",
        identityNumber: order.address?.identityNumber || "11111111111",
        gsmNumber: order.user.phone || undefined,
        registrationAddress:
          order.address?.shippingLine1 || "İstanbul, Türkiye",
        ip,
        city: order.address?.shippingCity || "İstanbul",
        country: "Turkey",
        zipCode: order.address?.shippingZip || undefined,
      },
      shippingAddress: {
        contactName: fullName,
        city: order.address?.shippingCity || "İstanbul",
        country: "Turkey",
        address: order.address?.shippingLine1 || "İstanbul, Türkiye",
      },
      billingAddress: {
        contactName: fullName,
        city: order.address?.billingCity || "İstanbul",
        country: "Turkey",
        address: order.address?.billingLine1 || "İstanbul, Türkiye",
      },
      basketItems,
    });

    if (result.status !== "success") {
      console.error("iyzico error:", result.errorMessage);
      return NextResponse.json(
        {
          error: "Ödeme başlatılamadı",
          details: result.errorMessage,
        },
        { status: 500 }
      );
    }

    // Payment kaydı oluştur
    await prisma.payment.create({
      data: {
        orderId: order.id,
        iyzicoConversationId: conversationId,
        amount: Number(order.grandTotal),
        currency: "TRY",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      checkoutFormContent: result.checkoutFormContent,
      token: result.token,
      conversationId,
    });
  } catch (error) {
    console.error("POST /api/payments/initialize error:", error);
    return NextResponse.json(
      { error: "Ödeme başlatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
