import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { invalidateProductCache } from "@/lib/cache";
import { updateParameterSchema } from "@/lib/validations/parameter";

// PUT /api/admin/products/:productId/parameters/:parameterId
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ productId: string; parameterId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId, parameterId } = await params;
  const body = await request.json();

  const parsed = updateParameterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Doğrulama hatası",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.parameter.findFirst({
      where: { id: parameterId, productId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Parametre bulunamadı" },
        { status: 404 }
      );
    }

    // İsim değişiyorsa uniqueness kontrolü
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.parameter.findFirst({
        where: {
          productId,
          name: parsed.data.name,
          id: { not: parameterId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Bu isimde bir parametre zaten var" },
          { status: 409 }
        );
      }
    }

    const updateData = {
      ...parsed.data,
      ...(parsed.data.validationRules !== undefined && {
        validationRules: parsed.data.validationRules
          ? parsed.data.validationRules
          : Prisma.JsonNull,
      }),
    };

    const parameter = await prisma.parameter.update({
      where: { id: parameterId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
    });

    await invalidateProductCache();

    return NextResponse.json({
      message: "Parametre güncellendi",
      parameter,
    });
  } catch (error) {
    console.error("PUT parameter error:", error);
    return NextResponse.json(
      { error: "Parametre güncellenirken hata oluştu" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/:productId/parameters/:parameterId
export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ productId: string; parameterId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { productId, parameterId } = await params;

  try {
    const existing = await prisma.parameter.findFirst({
      where: { id: parameterId, productId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Parametre bulunamadı" },
        { status: 404 }
      );
    }

    await prisma.parameter.delete({ where: { id: parameterId } });
    await invalidateProductCache();

    return NextResponse.json({ message: "Parametre silindi" });
  } catch (error) {
    console.error("DELETE parameter error:", error);
    return NextResponse.json(
      { error: "Parametre silinirken hata oluştu" },
      { status: 500 }
    );
  }
}
