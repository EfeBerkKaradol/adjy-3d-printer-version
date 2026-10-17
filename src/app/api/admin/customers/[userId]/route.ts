import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminDb } from "@/lib/agentPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// Müşteri kartına not ve etiket
//
// CRM'in defteri: "telefonla aradı, kargo gecikmesinden
// şikâyetçi" gibi, hiçbir tabloda yeri olmayan ama bir dahaki
// sefere bilinmesi gereken şeyler.
//
// Yetki admin layout'uyla aynı yoldan doğrulanır: rol JWT'den
// değil veritabanından okunur.
// ==========================================

const sema = z.object({
  /** Yeni not metni */
  note: z.string().trim().min(1).max(2000).optional(),
  /** Etiket listesi — gönderilirse mevcutların yerine geçer */
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;
  const parsed = sema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }
  const { note, tags } = parsed.data;
  if (note === undefined && tags === undefined) {
    return NextResponse.json({ error: "Not ya da etiket gerekli" }, { status: 400 });
  }

  const musteri = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!musteri) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });

  if (note !== undefined) {
    await prisma.customerNote.create({
      data: { userId, body: note, authorEmail: admin.email },
    });
  }

  if (tags !== undefined) {
    // Aynı etiket iki kez durmasın; sıra korunur.
    const benzersiz = [...new Set(tags)];
    await prisma.user.update({ where: { id: userId }, data: { crmTags: benzersiz } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;
  const noteId = request.nextUrl.searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId gerekli" }, { status: 400 });

  // userId de koşulda: başka müşterinin notu bu yoldan silinemesin.
  const silinen = await prisma.customerNote.deleteMany({ where: { id: noteId, userId } });
  if (silinen.count === 0) {
    return NextResponse.json({ error: "Not bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
