import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { actionSchema, requireAdminDb } from "@/lib/agentPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: henüz ajana ulaşmamış (bekleyen) işlemler — panel bunları "Senkron bekliyor" olarak gösterir. */
export async function GET() {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;
  const pending = await prisma.agentAction.findMany({
    where: { appliedAt: null },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: { id: true, kind: true, payload: true, createdAt: true, userEmail: true },
  });
  return NextResponse.json({ pending }, { headers: { "Cache-Control": "no-store" } });
}

/** Admin: panelden gelen işlem (onay, ret, içerik/maket durumu, talep, ayar). Ajan bir sonraki çekişte uygular. */
export async function POST(req: Request) {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz işlem", issues: parsed.error.issues.slice(0, 3) }, { status: 400 });
  }
  const open = await prisma.agentAction.count({ where: { appliedAt: null } });
  if (open >= 1000) return NextResponse.json({ error: "Çok fazla bekleyen işlem; ajanın senkronunu bekleyin" }, { status: 429 });
  await prisma.agentAction.create({
    data: {
      kind: parsed.data.kind,
      payload: parsed.data.payload as Prisma.InputJsonValue,
      userId: admin.userId,
      userEmail: admin.email,
    },
  });
  const pending = await prisma.agentAction.findMany({
    where: { appliedAt: null },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: { id: true, kind: true, payload: true, createdAt: true, userEmail: true },
  });
  return NextResponse.json({ ok: true, pending });
}
