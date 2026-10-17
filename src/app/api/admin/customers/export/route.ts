import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminDb } from "@/lib/agentPanel";
import { segmentBelirle, uykudaMi } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// GET /api/admin/customers/export — CSV
//
// Müşteri listesini dışarı alabilmek, CRM'in tabloya sıkışıp
// kalmamasını sağlar: e-posta listesi, muhasebe, toplu arama.
//
// Excel'in Türkçe ayarında ayraç noktalı virgüldür; virgülle
// yazılan dosya tek sütuna düşüyor. UTF-8 BOM da Türkçe
// karakterlerin bozulmaması için gerekiyor.
// ==========================================

const AYRAC = ";";

function hucre(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;

  const kullanicilar = await prisma.user.findMany({
    where: { role: "USER" },
    select: {
      email: true,
      fullName: true,
      phone: true,
      createdAt: true,
      crmTags: true,
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { grandTotal: true, createdAt: true },
      },
    },
  });

  const basliklar = [
    "Ad Soyad",
    "E-posta",
    "Telefon",
    "Segment",
    "Sipariş",
    "Toplam harcama",
    "Son sipariş",
    "Uykuda",
    "Etiketler",
    "Kayıt",
  ];

  const satirlar = kullanicilar
    .map((u) => {
      const toplamHarcama = u.orders.reduce((t, o) => t + Number(o.grandTotal), 0);
      const sonSiparis = u.orders.reduce<Date | null>(
        (en, o) => (!en || o.createdAt > en ? o.createdAt : en),
        null
      );
      const segment = segmentBelirle({
        siparisSayisi: u.orders.length,
        toplamHarcama,
        sonSiparis,
      });
      return { u, toplamHarcama, sonSiparis, segment };
    })
    .sort((a, b) => b.toplamHarcama - a.toplamHarcama)
    .map(({ u, toplamHarcama, sonSiparis, segment }) =>
      [
        u.fullName ?? "",
        u.email,
        u.phone ?? "",
        segment.label,
        u.orders.length,
        // Türkçe Excel ondalık ayracı virgül bekler
        toplamHarcama.toFixed(2).replace(".", ","),
        sonSiparis ? sonSiparis.toISOString().slice(0, 10) : "",
        uykudaMi(sonSiparis) ? "evet" : "hayır",
        u.crmTags.join(", "),
        u.createdAt.toISOString().slice(0, 10),
      ]
        .map(hucre)
        .join(AYRAC)
    );

  const csv = "﻿" + [basliklar.join(AYRAC), ...satirlar].join("\r\n");
  const ad = `adjy-musteriler-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ad}"`,
      "Cache-Control": "no-store",
    },
  });
}
