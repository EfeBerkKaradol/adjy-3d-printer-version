// ==========================================
// ÖDEMEYE HAZIR SİPARİŞ
//
// iyzico Checkout Form (/api/payments/initialize) ve sitenin
// kendi piksel kart formu (/api/payments/3ds/initialize) aynı
// siparişi, aynı alıcı/adres/sepet kurallarıyla iyzico'ya
// gönderir. İki yol ayrı ayrı yazılırsa sepet toplamı kuralları
// (PR #10'daki kuruş/indirim düzeltmesi) birinde unutulur; bu
// yüzden ortak kısım burada durur.
// ==========================================

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { CheckoutFormInitParams } from "@/lib/iyzico";

/** iyzico isteğinin kart dışındaki ortak alanları */
export type OrderPaymentParams = Omit<
  CheckoutFormInitParams,
  "callbackUrl" | "enabledInstallments"
>;

export type PreparedPayment =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      conversationId: string;
      amount: string;
      params: OrderPaymentParams;
    }
  | { ok: false; status: number; error: string };

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function prepareOrderPayment(
  request: NextRequest,
  orderId: unknown,
  guestToken: unknown,
  /** Hız sınırı anahtarının öneki; iki ödeme yolu ayrı sayılır */
  limitPrefix = "payment"
): Promise<PreparedPayment> {
  const session = await auth();

  if (!orderId || typeof orderId !== "string") {
    return { ok: false, status: 400, error: "Sipariş ID gerekli" };
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
    return { ok: false, status: 401, error: "Giriş yapmanız gerekiyor" };
  }

  // Hız sınırı: oturum varsa kullanıcıya, yoksa siparişe bağlanır
  const limitKey = session?.user?.id
    ? `${limitPrefix}:${session.user.id}`
    : `${limitPrefix}:order:${orderId}`;
  const { success } = await rateLimit(limitKey, { windowMs: 60_000, max: 5 });
  if (!success) {
    return { ok: false, status: 429, error: "Cok fazla istek. Lutfen bekleyin." };
  }

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
    return { ok: false, status: 404, error: "Sipariş bulunamadı" };
  }

  if (order.paymentStatus === "PAID") {
    return { ok: false, status: 400, error: "Bu sipariş zaten ödenmiş" };
  }

  const conversationId = `adjy_${order.id}_${Date.now()}`;
  const ip = clientIp(request);

  const fullName = order.user.fullName || "Müşteri";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "Müşteri";
  const lastName = nameParts.slice(1).join(" ") || firstName;

  // ==========================================
  // SEPET (iyzico kuralları)
  //
  // iyzico iki şeyi kesin ister:
  //   1) price = sepet kalemlerinin toplamı (kuruşu kuruşuna)
  //   2) her sepet kalemi > 0
  // Tutarlar kuruş (tam sayı) olarak kurulur, kupon indirimi
  // ürün satırlarına oranlı dağıtılır, sıfırlanan satırlar atılır.
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
    return { ok: false, status: 400, error: "Ödenecek tutar bulunamadı" };
  }

  if (sepetToplami !== genelToplam) {
    // Sipariş kaydındaki toplam ile kalemler kuruş farkı veriyorsa
    // müşteriden kalemlerin toplamı alınır; fark günlüğe düşer.
    console.warn(
      `iyzico sepet farkı — sipariş ${order.orderNumber}: kalemler ${sepetToplami} kuruş, grandTotal ${genelToplam} kuruş`
    );
  }

  const odenecek = (sepetToplami / 100).toFixed(2);

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    conversationId,
    amount: odenecek,
    params: {
      conversationId,
      price: odenecek,
      paidPrice: odenecek,
      currency: "TRY",
      basketId: order.id,
      paymentGroup: "PRODUCT",
      buyer: {
        id: order.user.id,
        name: firstName,
        surname: lastName,
        email: order.user.email || "customer@adjy.com",
        identityNumber: order.address?.identityNumber || "11111111111",
        gsmNumber: order.user.phone || undefined,
        registrationAddress: order.address?.shippingLine1 || "İstanbul, Türkiye",
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
    },
  };
}
