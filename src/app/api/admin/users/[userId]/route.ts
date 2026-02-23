import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";

// Kullanıcı rol / aktiflik güncelleme
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  const { userId } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.role && ["USER", "ADMIN", "SELLER"].includes(body.role)) {
    data.role = body.role;
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Güncellenecek alan belirtilmedi" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json({ message: "Kullanıcı güncellendi", user });
}
