import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SNAPSHOT_ID, requireAdminDb } from "@/lib/agentPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: panel arayüzü (HTML metni). Sayfa bunu sandbox'lı iframe'in srcdoc'una koyar. */
export async function GET() {
  const admin = await requireAdminDb();
  if (admin instanceof NextResponse) return admin;
  const snap = await prisma.agentSnapshot.findUnique({
    where: { id: SNAPSHOT_ID },
    select: { html: true, generatedAt: true, updatedAt: true },
  });
  if (!snap) return NextResponse.json({ error: "Ajan henüz senkron yapmadı" }, { status: 404 });
  return NextResponse.json(
    { html: snap.html, generatedAt: snap.generatedAt, updatedAt: snap.updatedAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
