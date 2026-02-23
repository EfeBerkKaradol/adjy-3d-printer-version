import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Admin yetkisi kontrolü — API route'larında kullanılır.
 * Eğer kullanıcı ADMIN değilse 403 döner, aksi halde userId döner.
 */
export async function requireAdmin(): Promise<
  { userId: string } | NextResponse
> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Giriş yapmanız gerekiyor" },
      { status: 401 }
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz yok" },
      { status: 403 }
    );
  }

  return { userId: session.user.id };
}

/**
 * Type guard: requireAdmin sonucunun NextResponse olup olmadığını kontrol eder
 */
export function isUnauthorized(
  result: { userId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
