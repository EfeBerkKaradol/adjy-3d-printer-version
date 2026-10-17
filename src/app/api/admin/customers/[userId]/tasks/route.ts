import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminDb } from "@/lib/agentPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// Müşteri takip görevleri
//
// "Cuma ara", "numune gönder" gibi sözler bir yere yazılmazsa
// unutuluyor. Görev tarihiyle birlikte durur ve yapılana kadar
// listeden düşmez.
// ==========================================

const olustur = z.object({
  title: z.string().trim().min(1).max(200),
  /** YYYY-MM-DD — saat tutulmaz, gün yeter */
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const guncelle = z.object({
  taskId: z.string().min(1),
  done: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;
  const govde = await request.json().catch(() => null);

  // Aynı uç hem yeni görev açar hem mevcut görevi kapatır:
  // gövdede taskId varsa ikincisidir.
  const kapat = guncelle.safeParse(govde);
  if (kapat.success) {
    const sonuc = await prisma.customerTask.updateMany({
      where: { id: kapat.data.taskId, userId },
      data: { doneAt: kapat.data.done ? new Date() : null },
    });
    if (sonuc.count === 0) {
      return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = olustur.safeParse(govde);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const musteri = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!musteri) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });

  await prisma.customerTask.create({
    data: {
      userId,
      title: parsed.data.title,
      // Günün sonuna alınır: "bugün" denen bir iş gün bitmeden gecikmiş sayılmasın.
      dueAt: parsed.data.dueAt ? new Date(`${parsed.data.dueAt}T23:59:59`) : null,
      createdBy: admin.email,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;

  const { userId } = await params;
  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId gerekli" }, { status: 400 });

  const silinen = await prisma.customerTask.deleteMany({ where: { id: taskId, userId } });
  if (silinen.count === 0) {
    return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
