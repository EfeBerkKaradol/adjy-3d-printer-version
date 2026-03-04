import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { invalidateProductCache } from "@/lib/cache";
import {
  createParameterSchema,
  reorderParametersSchema,
} from "@/lib/validations/parameter";

// GET /api/admin/products/:productId/parameters
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const parameters = await prisma.parameter.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ parameters });
}

// POST /api/admin/products/:productId/parameters
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId } = await params;
  const body = await request.json();

  const parsed = createParameterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  try {
    const createData = {
      ...parsed.data,
      productId,
      validationRules: parsed.data.validationRules
        ? parsed.data.validationRules
        : Prisma.JsonNull,
    };

    const parameter = await prisma.parameter.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: createData as any,
    });

    await invalidateProductCache();

    return NextResponse.json(
      { message: "Parametre oluşturuldu", parameter },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Bu isimde bir parametre zaten var" },
        { status: 409 }
      );
    }
    console.error("POST parameters error:", error);
    return NextResponse.json(
      { error: "Parametre oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/products/:productId/parameters — sıralama güncelleme
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId } = await params;
  const body = await request.json();

  const parsed = reorderParametersSchema.safeParse(body.orders);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz sıralama verisi" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.parameter.update({
          where: { id: item.id, productId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    await invalidateProductCache();

    return NextResponse.json({ message: "Sıralama güncellendi" });
  } catch (error) {
    console.error("PATCH parameters reorder error:", error);
    return NextResponse.json(
      { error: "Sıralama güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}
