import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SNAPSHOT_ID, requireAdminDb } from "@/lib/agentPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: panel verisi (gzip'li JSON olduğu gibi gönderilir). */
export async function GET() {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;
  const snap = await prisma.agentSnapshot.findUnique({ where: { id: SNAPSHOT_ID }, select: { stateGz: true } });
  if (!snap) return NextResponse.json({ error: "Ajan henüz senkron yapmadı" }, { status: 404 });
  return new Response(new Uint8Array(snap.stateGz), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "gzip",
      "Cache-Control": "no-store",
    },
  });
}
