import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateCouponSchema } from "@/lib/validations/coupon";

// POST /api/coupons/validate — Kupon kodunu dogrula ve indirim hesapla
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giris yapmalsiniz" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = validateCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Gecersiz veri" }, { status: 400 });
  }

  const { code, orderTotal } = parsed.data;

  // Kuponu bul
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Kupon bulunamadi" });
  }

  // Aktiflik kontrolu
  if (!coupon.isActive) {
    return NextResponse.json({ valid: false, error: "Bu kupon artik gecerli degil" });
  }

  // Tarih kontrolu
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return NextResponse.json({ valid: false, error: "Bu kupon henuz gecerli degil" });
  }
  if (coupon.validTo && now > coupon.validTo) {
    return NextResponse.json({ valid: false, error: "Bu kuponun suresi dolmus" });
  }

  // Kullanim limiti kontrolu
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: "Bu kupon kullanim limitine ulasmis" });
  }

  // Minimum siparis tutari kontrolu
  const minAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
  if (orderTotal < minAmount) {
    return NextResponse.json({
      valid: false,
      error: `Minimum siparis tutari ${minAmount.toFixed(2)} TL olmalidir`,
    });
  }

  // Indirim hesapla
  const couponValue = Number(coupon.value);
  let calculatedDiscount = 0;

  if (coupon.type === "PERCENTAGE") {
    calculatedDiscount = Math.min((orderTotal * couponValue) / 100, orderTotal);
  } else {
    calculatedDiscount = Math.min(couponValue, orderTotal);
  }

  calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

  return NextResponse.json({
    valid: true,
    discount: {
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: couponValue,
      calculatedDiscount,
      description: coupon.description,
    },
  });
}
