import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { initializeCheckoutForm } from "@/lib/iyzico";
import { rateLimit } from "@/lib/rate-limit";
import { getAbsoluteUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { orderId, guestToken } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Sipariş ID gerekli" },
        { status: 400 }
      );
    }

    // ==========================================
    // YETKİ
    //
    // Üye siparişinde sahiplik oturumdan doğrulanır.
    // Misafir siparişinde oturum yoktur; sipariş oluşturulurken
    // verilen tek kullanımlık anahtar istenir. Aksi hâlde
    // sipariş kimliğini tahmin eden biri başkasının siparişi
    // için ödeme başlatabilirdi.
    // ==========================================
    if (!session?.user?.id && !guestToken) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    // Hız sınırı: oturum varsa kullanıcıya, yoksa siparişe bağlanır
    const limitKey = session?.user?.id ? `payment:${session.user.id}` : `payment:order:${orderId}`;
    const { success } = await rateLimit(limitKey, { windowMs: 60_000, max: 5 });
    if (!success) {
      return NextResponse.json({ error: "Cok fazla istek. Lutfen bekleyin." }, { status: 429 });
    }

    // Siparişi bul
    const order = await prisma.order.findFirst({
      where: session?.user?.id
        ? { id: orderId, userId: session.user.id }
        : { id: orderId, isGuest: true, guestToken: String(guestToken) },
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

    // ==========================================
    // SEPET (iyzico kuralları)
    //
    // iyzico iki şeyi kesin ister:
    //   1) price = sepet kalemlerinin toplamı (kuruşu kuruşuna)
    //   2) her sepet kalemi > 0
    // Eski kod kupon indirimini sepete yansıtmıyordu (price ürünler
    // + kargo toplamından küçük kalıyordu) ve satır toplamları ile
    // genel toplam ayrı ayrı yuvarlandığı için kuruş farkı
    // çıkabiliyordu; iki durumda da iyzico isteği reddediyor ve
    // müşteri "Ödeme başlatılamadı" görüyordu. Tutarlar burada
    // kuruş (tam sayı) olarak kurulur, indirim ürün satırlarına
    // oranlı dağıtılır, sıfırlanan satırlar atılır.
    // ==========================================
    const kurus = (v: unknown) => Math.round(Number(v) * 100);

    type Kalem = {
      id: string;
      name: string;
      category1: string;
      itemType: "PHYSICAL";
      cents: number;
    };

    const urunKalemleri: Kalem[] = order.items.map((item, i) => ({
      // Aynı ürün sepette iki kez olabilir; kalem kimliği tekil kalsın
      id: `${item.product.id}-${i + 1}`.slice(0, 100),
      name: (item.product.name || "Ürün").slice(0, 100),
      category1: (item.product.category?.name || "3D Baskı").slice(0, 100),
      itemType: "PHYSICAL",
      cents: kurus(item.lineTotal),
    }));

    // Kupon indirimini ürün satırlarına oranlı dağıt
    let indirim = Math.max(0, kurus(order.discountAmount));
    const urunToplami = urunKalemleri.reduce((t, k) => t + k.cents, 0);
    if (indirim > 0 && urunToplami > 0) {
      indirim = Math.min(indirim, urunToplami);
      let dagitilan = 0;
      urunKalemleri.forEach((k, i) => {
        const pay =
          i === urunKalemleri.length - 1
            ? indirim - dagitilan
            : Math.floor((indirim * k.cents) / urunToplami);
        const uygulanan = Math.min(pay, k.cents);
        k.cents -= uygulanan;
        dagitilan += uygulanan;
      });
      // Son satır tavanına takıldıysa artanı diğerlerinden düş
      let kalan = indirim - dagitilan;
      for (const k of urunKalemleri) {
        if (kalan <= 0) break;
        const d = Math.min(kalan, k.cents);
        k.cents -= d;
        kalan -= d;
      }
    }

    const kalemler: Kalem[] = [...urunKalemleri];

    // Kargo da sepet kalemi olmalı (toplam = kalemler toplamı)
    const kargo = kurus(order.shippingCost);
    if (kargo > 0) {
      kalemler.push({
        id: "shipping",
        name: "Kargo Ücreti",
        category1: "Kargo",
        itemType: "PHYSICAL",
        cents: kargo,
      });
    }

    const basketItems = kalemler
      .filter((k) => k.cents > 0)
      .map(({ cents, ...k }) => ({ ...k, price: (cents / 100).toFixed(2) }));

    const sepetToplami = kalemler.reduce((t, k) => t + Math.max(0, k.cents), 0);
    const genelToplam = kurus(order.grandTotal);

    if (basketItems.length === 0 || sepetToplami <= 0) {
      return NextResponse.json(
        { error: "Ödenecek tutar bulunamadı" },
        { status: 400 }
      );
    }

    if (sepetToplami !== genelToplam) {
      // Sipariş kaydındaki toplam ile kalemler kuruş farkı veriyorsa
      // müşteriden kalemlerin toplamı alınır; fark günlüğe düşer.
      console.warn(
        `iyzico sepet farkı — sipariş ${order.orderNumber}: kalemler ${sepetToplami} kuruş, grandTotal ${genelToplam} kuruş`
      );
    }

    const odenecek = (sepetToplami / 100).toFixed(2);

    // iyzico Checkout Form başlat
    const result = await initializeCheckoutForm({
      conversationId,
      price: odenecek,
      paidPrice: odenecek,
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
      // Hata kodu olmadan günlükten ayırt edilemiyordu: 9000 (üye
      // işyeri ödeme almaya yetkili değil) ile sepet/alıcı
      // doğrulama hataları aynı satıra düşüyordu.
      console.error(
        `iyzico initialize başarısız — sipariş ${order.orderNumber}, kod ${
          (result as { errorCode?: string }).errorCode ?? "?"
        }: ${result.errorMessage ?? "mesaj yok"}`
      );
      return NextResponse.json(
        {
          error: "Ödeme başlatılamadı",
          code: (result as { errorCode?: string }).errorCode ?? null,
          details: result.errorMessage ?? null,
        },
        { status: 502 }
      );
    }

    // Payment kaydı oluştur
    await prisma.payment.create({
      data: {
        orderId: order.id,
        iyzicoConversationId: conversationId,
        amount: Number(odenecek),
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
