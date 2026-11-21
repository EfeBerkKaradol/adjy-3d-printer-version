import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { ornekSiparisleriKur } from "@/lib/tasarim/ornekSiparisler";

// ==========================================
// POST /api/admin/ornek-siparisler
//
// Örnek siparişleri açar ya da yeniler (bkz. lib/tasarim/
// ornekSiparisler). Canlı veritabanına betik çalıştırmadan örnek
// kurmanın yolu: admin → Kendin Üret Atölyesi.
// ==========================================

export const maxDuration = 60;

export async function POST() {
  const yetki = await requireAdmin();
  if (isUnauthorized(yetki)) return yetki;

  try {
    return NextResponse.json(await ornekSiparisleriKur(prisma));
  } catch (e) {
    console.error("POST /api/admin/ornek-siparisler", e);
    return NextResponse.json({ error: "Örnek siparişler kurulamadı" }, { status: 500 });
  }
}
