import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { createCouponSchema } from "@/lib/validations/coupon";

// GET /api/admin/coupons — Kupon listesi
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.count({ where }),
  ]);

  return NextResponse.json({
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      type: c.type,
      value: Number(c.value),
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      validFrom: c.validFrom.toISOString(),
      validTo: c.validTo?.toISOString() || null,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/admin/coupons — Yeni kupon olustur
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const body = await request.json();
  const parsed = createCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Gecersiz veri", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const code = data.code.toUpperCase();

  // Kod benzersizlik kontrolu
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "Bu kupon kodu zaten kullaniliyor" }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code,
      description: data.description || null,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount || null,
      maxUses: data.maxUses || null,
      validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
      validTo: data.validTo ? new Date(data.validTo) : null,
      isActive: data.isActive,
    },
  });

  return NextResponse.json(
    { message: "Kupon olusturuldu", coupon: { id: coupon.id, code: coupon.code } },
    { status: 201 }
  );
}
