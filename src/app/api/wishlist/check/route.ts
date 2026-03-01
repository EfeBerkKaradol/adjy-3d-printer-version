import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/wishlist/check?productIds=id1,id2,id3
// Toplu favori kontrol — hangi ürünler favorilerde?
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ wishlistedIds: [] });
  }

  const { searchParams } = new URL(request.url);
  const productIdsRaw = searchParams.get("productIds");
  if (!productIdsRaw) {
    return NextResponse.json({ wishlistedIds: [] });
  }

  const productIds = productIdsRaw.split(",").filter(Boolean);
  if (productIds.length === 0) {
    return NextResponse.json({ wishlistedIds: [] });
  }

  const wishlisted = await prisma.wishlist.findMany({
    where: {
      userId: session.user.id,
      productId: { in: productIds },
    },
    select: { productId: true },
  });

  return NextResponse.json({
    wishlistedIds: wishlisted.map((w) => w.productId),
  });
}
