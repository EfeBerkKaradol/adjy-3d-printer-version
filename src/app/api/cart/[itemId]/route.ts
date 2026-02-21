import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateCartItemSchema } from "@/lib/validations/cart";

// ==========================================
// PATCH /api/cart/:itemId
// Sepetteki bir ürünün miktarını günceller.
// ==========================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    const body = await request.json();
    const { quantity } = updateCartItemSchema.parse(body);

    // [GÖREV 14]: Sepet öğesini güncelle
    const cartItem = await prisma.cartItem.updateMany({
      where: { id: itemId, userId: session.user.id },
      data: { quantity },
    });

    if (cartItem.count === 0) {
      return NextResponse.json(
        { error: "Ürün bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Miktar güncellendi" });
  } catch (error) {
    console.error("PATCH /api/cart/[itemId] error:", error);
    return NextResponse.json(
      { error: "Güncelleme sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE /api/cart/:itemId
// Sepetten bir ürünü siler.
// ==========================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Giris yapmaniz gerekiyor" },
        { status: 401 }
      );
    }

    const { itemId } = await params;

    // [GÖREV 15]: Sepet öğesini sil
    const deleted = await prisma.cartItem.deleteMany({
      where: { id: itemId, userId: session.user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Urun bulunamadi" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Ürün sepetten çıkarıldı" });
  } catch (error) {
    console.error("DELETE /api/cart/[itemId] error:", error);
    return NextResponse.json(
      { error: "Silme sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
