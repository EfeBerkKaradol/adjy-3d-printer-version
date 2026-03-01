import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

// GET /api/admin/coupons/:couponId
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { couponId } = await params;

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) {
    return NextResponse.json({ error: "Kupon bulunamadi" }, { status: 404 });
  }

  return NextResponse.json({
    coupon: {
      ...coupon,
      value: Number(coupon.value),
      minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      validFrom: coupon.validFrom.toISOString(),
      validTo: coupon.validTo?.toISOString() || null,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    },
  });
}

// PATCH /api/admin/coupons/:couponId
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { couponId } = await params;
  const body = await request.json();

  const {
    code, description, type, value,
    minOrderAmount, maxUses, validFrom, validTo, isActive,
  } = body;

  try {
    // Kod benzersizlik kontrolu
    if (code) {
      const existing = await prisma.coupon.findFirst({
        where: { code: code.toUpperCase(), id: { not: couponId } },
      });
      if (existing) {
        return NextResponse.json({ error: "Bu kupon kodu zaten kullaniliyor" }, { status: 409 });
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value }),
        ...(minOrderAmount !== undefined && { minOrderAmount }),
        ...(maxUses !== undefined && { maxUses }),
        ...(validFrom !== undefined && { validFrom: new Date(validFrom) }),
        ...(validTo !== undefined && { validTo: validTo ? new Date(validTo) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ message: "Kupon guncellendi", coupon: { id: coupon.id, code: coupon.code } });
  } catch (error) {
    console.error("PATCH /api/admin/coupons/[couponId] error:", error);
    return NextResponse.json({ error: "Kupon guncellenirken hata olustu" }, { status: 500 });
  }
}

// DELETE /api/admin/coupons/:couponId — Kuponu pasif yap
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { couponId } = await params;

  await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "Kupon devre disi birakildi" });
}
